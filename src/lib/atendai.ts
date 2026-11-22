import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { DATA_DIR, getStoredLeads, StoredLead } from '@/lib/db'
import { absolute, pagamentoPath, vistoriaPath } from '@/lib/links'

/**
 * API de atendimento (`/api/atendai/v1`): o chat da CITmax (AtendeHub) cota,
 * contrata e acompanha o cadastro do 21Go como o cliente faria no site.
 *
 * Servidor a servidor: só com `Authorization: Bearer ATENDAI_API_KEY`. Sem a
 * variável, a API fica desligada (503). O WhatsApp do cliente vem da conversa
 * do lado do AtendeHub; aqui ele é só o dado do cadastro.
 */

export function autorizarAtendai(req: NextRequest): NextResponse | null {
  const chave = process.env.ATENDAI_API_KEY || ''
  if (chave.length < 24) {
    return NextResponse.json({ erro: 'A API de atendimento não está ligada.' }, { status: 503 })
  }
  const header = req.headers.get('authorization') || ''
  const enviado = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const a = crypto.createHash('sha256').update(enviado).digest()
  const b = crypto.createHash('sha256').update(chave).digest()
  if (!enviado || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ erro: 'Chave recusada.' }, { status: 401 })
  }
  return null
}

export function json(dados: unknown, status = 200): NextResponse {
  return NextResponse.json(dados, { status, headers: { 'Cache-Control': 'no-store' } })
}

/* ------------------------------------------------------------------------- */
/* Cotações guardadas: a IA carrega um número curto, não o token assinado.   */
/* ------------------------------------------------------------------------- */

const COTACOES_FILE = path.join(DATA_DIR, 'atendai-cotacoes.json')
const COTACAO_TTL_MS = 2 * 60 * 60 * 1000

export interface CotacaoGuardada {
  token: string
  placa: string
  usoApp: boolean
  /** Regra do motor de preço: o veículo pode ter a mensalidade com adesivo. */
  elegivelAdesivo: boolean
  expiraEm: number
}

function lerJson<T>(arquivo: string, padrao: T): T {
  try {
    return JSON.parse(fs.readFileSync(arquivo, 'utf-8')) as T
  } catch {
    return padrao
  }
}

function gravarJson(arquivo: string, dados: unknown): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${arquivo}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(dados), 'utf-8')
  fs.renameSync(tmp, arquivo)
}

export function guardarCotacao(c: Omit<CotacaoGuardada, 'expiraEm'>): { id: string; expiraEm: number } {
  const agora = Date.now()
  const todas = lerJson<Record<string, CotacaoGuardada>>(COTACOES_FILE, {})
  for (const [k, v] of Object.entries(todas)) if (v.expiraEm < agora) delete todas[k]
  const id = `cot_${crypto.randomBytes(6).toString('hex')}`
  const expiraEm = agora + COTACAO_TTL_MS
  todas[id] = { ...c, expiraEm }
  gravarJson(COTACOES_FILE, todas)
  return { id, expiraEm }
}

export function lerCotacao(id: string): CotacaoGuardada | null {
  if (!/^cot_[a-f0-9]{12}$/.test(id)) return null
  const c = lerJson<Record<string, CotacaoGuardada>>(COTACOES_FILE, {})[id]
  return c && c.expiraEm > Date.now() ? c : null
}

/* ------------------------------------------------------------------------- */
/* Idempotência do cadastro: a mesma chave devolve o mesmo protocolo.        */
/* ------------------------------------------------------------------------- */

const IDEM_FILE = path.join(DATA_DIR, 'atendai-idempotencia.json')
const IDEM_TTL_MS = 24 * 60 * 60 * 1000

export interface RespostaCadastro {
  protocolo: string
  linkDocumentos: string
  mensagem: string
}

/** Só o hash da chave fica no disco. */
function hashChave(chave: string): string {
  return crypto.createHash('sha256').update(chave).digest('hex')
}

export function respostaJaDada(chave: string): RespostaCadastro | null {
  const r = lerJson<Record<string, RespostaCadastro & { em: number }>>(IDEM_FILE, {})[hashChave(chave)]
  if (!r || r.em + IDEM_TTL_MS <= Date.now()) return null
  return { protocolo: r.protocolo, linkDocumentos: r.linkDocumentos, mensagem: r.mensagem }
}

export function guardarResposta(chave: string, resposta: RespostaCadastro): void {
  const agora = Date.now()
  const todas = lerJson<Record<string, RespostaCadastro & { em: number }>>(IDEM_FILE, {})
  for (const [k, v] of Object.entries(todas)) if (v.em + IDEM_TTL_MS < agora) delete todas[k]
  todas[hashChave(chave)] = { ...resposta, em: agora }
  gravarJson(IDEM_FILE, todas)
}

/* ------------------------------------------------------------------------- */
/* Situação do cadastro pelo WhatsApp.                                       */
/* ------------------------------------------------------------------------- */

/** DDD + 8 últimos dígitos: casa com ou sem 55 e com ou sem o 9. */
export function chaveTelefone(bruto: string): string | null {
  let d = String(bruto || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length < 10) return null
  return `${d.slice(0, 2)}${d.slice(-8)}`
}

/**
 * Cadastro mais recente deste telefone: o WhatsApp do cadastro (contato) ou o da conversa
 * do chat, quando o cliente deu outro número para contato.
 */
export function cadastroMaisRecente(telefone: string): StoredLead | null {
  const chave = chaveTelefone(telefone)
  if (!chave) return null
  const doCliente = getStoredLeads()
    .filter(
      (l) =>
        l.status !== 'cancelado' &&
        (chaveTelefone(l.whatsapp) === chave || (l.atendaiTelefone ? chaveTelefone(l.atendaiTelefone) === chave : false))
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return doCliente[0] ?? null
}

export interface Situacao {
  encontrado: boolean
  etapa?: string
  etapaTexto?: string
  proximoPasso?: string
  placa?: string | null
  plano?: string
  links?: Record<string, string>
}

/** Em que passo o cliente está, sem dado pessoal (só etapa, placa, plano e links). */
export function situacaoDoCadastro(lead: StoredLead | null): Situacao {
  if (!lead) return { encontrado: false }
  const base = { encontrado: true, placa: lead.placa || lead.vehicle?.placa || null, plano: lead.planoEscolhidoNome }
  const pago = Boolean(lead.pagamento?.paidAt)
  if (pago || lead.status === 'adesao_paga' || lead.status === 'aprovado') {
    return {
      ...base,
      etapa: 'concluido',
      etapaTexto: 'Cadastro completo',
      proximoPasso: 'A 21Go envia os dados de acesso por e-mail e WhatsApp.',
    }
  }
  if (lead.status === 'aguardando_pagamento' || lead.pagamento) {
    return {
      ...base,
      etapa: 'pagamento',
      etapaTexto: 'Vistoria aprovada, falta o Pix da adesão',
      proximoPasso: 'Pagar a taxa de adesão por Pix no link. A confirmação é automática.',
      links: { pagamento: absolute(pagamentoPath(lead.ref)) },
    }
  }
  const vistoria = lead.crmVistoria?.vistoriaStatus
  if (vistoria === 'aguardando_revisao') {
    return {
      ...base,
      etapa: 'analise',
      etapaTexto: 'Fotos da vistoria em análise',
      proximoPasso: 'A equipe da 21Go está analisando as fotos. A resposta chega por WhatsApp e e-mail.',
    }
  }
  if (lead.appVistoUrl) {
    return {
      ...base,
      etapa: 'vistoria',
      etapaTexto: 'Vistoria liberada',
      proximoPasso: 'Fazer as fotos do veículo pelo celular no link da vistoria.',
      links: { vistoria: lead.appVistoUrl },
    }
  }
  if (lead.vistoriaData) {
    return {
      ...base,
      etapa: 'gerando_vistoria',
      etapaTexto: 'Documentos recebidos',
      proximoPasso: 'O link da vistoria chega aqui em alguns minutos.',
      links: { acompanhar: absolute(vistoriaPath(lead)) },
    }
  }
  return {
    ...base,
    etapa: 'documentos',
    etapaTexto: 'Falta enviar os documentos',
    proximoPasso: 'Enviar CNH ou RG, o documento do carro e o comprovante de residência pelo link.',
    links: { documentos: absolute(vistoriaPath(lead)) },
  }
}
