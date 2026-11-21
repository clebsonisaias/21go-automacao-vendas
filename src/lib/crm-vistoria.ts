import { StoredLead, findLeadByRef, getStoredLeads, updateLead } from './db'
import { sendWhatsAppAppVisto } from './citchat'
import { esc, sendTelegramNotification } from './telegram'

// Gera sozinho o link da vistoria oficial (Vistoria 21Go) no CRM 21Go, depois que o cliente envia
// os documentos no site. Mesmas chamadas que o botão "Gerar link" do CRM faz:
//   1. acha a negociação pela placa (ela chega do PowerCRM alguns minutos depois do cadastro);
//   2. marca no CRM o plano que o cliente escolheu no site e o aceite da simulação (requisitos do CRM);
//   3. POST /vistoria-propria/{negociação} e espera o link (o CRM tenta de novo sozinho se demorar);
//   4. guarda o link no cadastro: aparece na tela do cliente e vai no WhatsApp.
// Falhou? O agendador tenta de novo a cada minuto; depois de muitas tentativas avisa no Telegram
// e a equipe pode colar o link à mão no /admin.

const CRM = (process.env.CRM_BASE_URL || 'https://www.crm21go.site/api').replace(/\/+$/, '')
const MAX_TENTATIVAS = 30 // ~30 min (o PowerCRM leva alguns minutos para passar a negociação ao CRM)

export function crmVistoriaEnabled(): boolean {
  return Boolean(process.env.CRM_EMAIL && process.env.CRM_PASSWORD) && process.env.CRM_VISTORIA_AUTO !== 'off'
}

let token: string | null = null
let tokenAt = 0

async function login(): Promise<string> {
  const res = await fetch(`${CRM}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: process.env.CRM_EMAIL, password: process.env.CRM_PASSWORD }),
    signal: AbortSignal.timeout(20000),
  })
  const data = (await res.json().catch(() => ({}))) as { token?: string }
  if (!res.ok || !data.token) throw new Error(`login no CRM recusado (HTTP ${res.status})`)
  token = data.token
  tokenAt = Date.now()
  return token
}

async function crm<T = any>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<{ status: number; data: T }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = token && Date.now() - tokenAt < 50 * 60_000 ? token : await login()
    const res = await fetch(`${CRM}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${t}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    if (res.status === 401 && attempt === 0) {
      token = null
      continue
    }
    const data = (await res.json().catch(() => ({}))) as T
    return { status: res.status, data }
  }
  throw new Error('CRM recusou o acesso')
}

const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

function errMsg(data: any, fallback: string): string {
  const m = data?.error || data?.message || data?.mensagem
  const faltas = Array.isArray(data?.faltas) ? ` (${data.faltas.map((f: any) => f?.label || f).join(', ')})` : ''
  return `${typeof m === 'string' ? m : fallback}${faltas}`.slice(0, 240)
}

type Neg = { id: string; createdAt?: string; arquivada?: boolean; cotacoes?: { id: string; placa?: string | null }[]; associado?: { nome?: string } }

/** Negociação do cadastro no CRM: mesma placa, criada depois do cadastro no site (com folga). */
async function findNegociacao(lead: StoredLead): Promise<{ negId: string; cotacaoId: string } | null> {
  const placa = norm(lead.placa || lead.vehicle?.placa)
  if (placa.length < 7) throw new Error('cadastro sem placa: não dá para achar a negociação no CRM')
  const { status, data } = await crm<any>('GET', `/negociacoes?search=${encodeURIComponent(placa)}`)
  if (status !== 200) throw new Error(errMsg(data, `lista de negociações falhou (HTTP ${status})`))
  const list: Neg[] = Array.isArray(data) ? data : data?.data || data?.items || []
  const desde = new Date(lead.createdAt).getTime() - 15 * 60_000
  // Mesma placa pode ter mais de uma negociação (outros testes, outro dono): exige o mesmo primeiro nome.
  const primeiro = norm(String(lead.nome || '').trim().split(/\s+/)[0])
  const candidatas = list
    .filter((n) => !n.arquivada && new Date(n.createdAt || 0).getTime() >= desde)
    .filter((n) => primeiro.length >= 2 && norm(n.associado?.nome).startsWith(primeiro))
    .map((n) => ({ n, cot: (n.cotacoes || []).find((c) => norm(c.placa) === placa) }))
    .filter((x): x is { n: Neg; cot: { id: string } } => Boolean(x.cot))
    .sort((a, b) => new Date(a.n.createdAt || 0).getTime() - new Date(b.n.createdAt || 0).getTime())
  const hit = candidatas[0]
  return hit ? { negId: hit.n.id, cotacaoId: hit.cot.id } : null
}

/** Plano escolhido no site e aceite da simulação: o CRM exige os dois antes da vistoria. */
async function ensureRequisitos(lead: StoredLead, negId: string, cotacaoId: string): Promise<void> {
  const { status, data: neg } = await crm<any>('GET', `/negociacoes/${negId}`)
  if (status !== 200) throw new Error(errMsg(neg, `negociação não abriu (HTTP ${status})`))
  const req: { chave: string; ok: boolean }[] = neg?.requisitos?.vistoria || []
  const falta = (k: string) => req.some((r) => r.chave === k && !r.ok)

  if (falta('plano')) {
    const pl = await crm<any>('GET', `/negociacoes/${negId}/cotacoes/${cotacaoId}/planos`)
    const planos: { tppId: number; nome: string; valor?: number }[] = pl.data?.planos || []
    const alvo = norm(lead.planoEscolhidoNome)
    const plano = planos.find((p) => norm(p.nome) === alvo) || planos.find((p) => alvo && (norm(p.nome).includes(alvo) || alvo.includes(norm(p.nome))))
    if (!plano) {
      throw new Error(`plano "${lead.planoEscolhidoNome}" não existe na cotação do CRM (${planos.map((p) => p.nome).join(', ') || 'sem planos'})`)
    }
    const r = await crm<any>('PUT', `/negociacoes/${negId}/plano`, {
      tppId: plano.tppId,
      nome: plano.nome,
      valorMensal: plano.valor ?? undefined,
      cotacaoId,
    })
    if (r.status >= 300) throw new Error(errMsg(r.data, `não salvou o plano (HTTP ${r.status})`))
  }

  if (falta('aceite')) {
    const r = await crm<any>('POST', `/negociacoes/${negId}/aceite`, { cotacaoId })
    if (r.status >= 300) throw new Error(errMsg(r.data, `não registrou o aceite (HTTP ${r.status})`))
  }
}

type Estado = { url?: string; aguardandoLink?: boolean; filaEstado?: string; ultimoErro?: string } | null

async function estadoVistoria(negId: string, cotacaoId: string): Promise<Estado> {
  const { status, data } = await crm<any>('GET', `/vistoria-propria/${negId}?cotacaoId=${encodeURIComponent(cotacaoId)}`)
  if (status !== 200) throw new Error(errMsg(data, `estado da vistoria falhou (HTTP ${status})`))
  if (data?.configurado === false) throw new Error('a Vistoria 21Go não está configurada no CRM')
  return data?.vistoria || null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Uma rodada para um cadastro. Devolve o link quando sai; null = ainda não (tenta na próxima). */
async function gerarUmaVez(lead: StoredLead): Promise<string | null> {
  let { negId, cotacaoId } = lead.crmVistoria || {}
  if (!negId || !cotacaoId) {
    const found = await findNegociacao(lead)
    if (!found) throw new Error('negociação ainda não chegou ao CRM 21Go')
    ;({ negId, cotacaoId } = found)
    updateLead(lead.ref, (l) => {
      l.crmVistoria = { ...(l.crmVistoria || { tentativas: 0 }), negId, cotacaoId }
    })
  }

  let v = await estadoVistoria(negId, cotacaoId)
  if (!v) {
    await ensureRequisitos(lead, negId, cotacaoId)
    const r = await crm<any>('POST', `/vistoria-propria/${negId}`, { cotacaoId, zeroKm: false })
    if (r.status >= 300) throw new Error(errMsg(r.data, `CRM não gerou a vistoria (HTTP ${r.status})`))
    v = r.data?.vistoria || r.data || null
  } else if (!v.url && v.filaEstado === 'travada') {
    // O CRM desistiu de tentar: pede de novo (é o que o botão "Corrigi, gerar o link de novo" faz).
    await crm<any>('POST', `/vistoria-propria/${negId}`, { cotacaoId, zeroKm: false })
  }

  for (let i = 0; i < 4 && !v?.url; i++) {
    await sleep(5000)
    v = await estadoVistoria(negId, cotacaoId)
  }
  if (v?.url) return v.url
  if (v?.filaEstado === 'travada') throw new Error(v.ultimoErro || 'o CRM não conseguiu gerar o link')
  return null
}

/** Guarda o link no cadastro (a tela do site mostra) e manda no WhatsApp. Usado também pelo /admin. */
export async function entregarLinkVistoria(lead: StoredLead, url: string, origem: 'auto' | 'manual') {
  const updated = updateLead(lead.ref, (l) => {
    l.appVistoUrl = url
    l.appVistoEnviadoEm = new Date().toISOString()
    if (l.crmVistoria) l.crmVistoria.ultimoErro = undefined
  })
  const wa = await sendWhatsAppAppVisto({ telefone: lead.whatsapp, nome: lead.nome, url })
  await sendTelegramNotification(
    `📸 <b>Link da vistoria ${origem === 'auto' ? 'gerado sozinho no CRM e ' : ''}enviado</b> — ${esc(lead.nome)} (${esc(
      lead.placa || 'sem placa'
    )}). ${wa.success ? 'Cliente recebeu no WhatsApp e vê o link no site.' : 'WhatsApp falhou; o link está no site do cliente.'}`
  )
  return { lead: updated, whatsappEnviado: wa.success }
}

const emAndamento = new Set<string>()

/** Tenta gerar e entregar o link de um cadastro. Seguro para chamar várias vezes. */
export async function gerarLinkVistoria(ref: string): Promise<void> {
  if (!crmVistoriaEnabled() || emAndamento.has(ref)) return
  const lead = findLeadByRef(ref)
  if (!lead || lead.appVistoUrl || !lead.vistoriaData || lead.status === 'cancelado') return
  if ((lead.crmVistoria?.tentativas ?? 0) >= MAX_TENTATIVAS) return

  // Trava gravada no cadastro: a rota do envio e o agendador rodam em instâncias separadas do módulo.
  const lockAt = lead.crmVistoria?.lockAt ? new Date(lead.crmVistoria.lockAt).getTime() : 0
  if (Date.now() - lockAt < 3 * 60_000) return
  emAndamento.add(ref)
  updateLead(ref, (l) => {
    l.crmVistoria = { ...(l.crmVistoria || { tentativas: 0 }), lockAt: new Date().toISOString() }
  })
  try {
    const url = await gerarUmaVez(lead)
    if (url) {
      await entregarLinkVistoria(findLeadByRef(ref) || lead, url, 'auto')
      return
    }
    registrarTentativa(ref, 'o CRM ainda está gerando o link')
  } catch (err) {
    registrarTentativa(ref, err instanceof Error ? err.message : String(err))
  } finally {
    emAndamento.delete(ref)
    updateLead(ref, (l) => {
      if (l.crmVistoria) l.crmVistoria.lockAt = undefined
    })
  }
}

function registrarTentativa(ref: string, motivo: string) {
  const l = updateLead(ref, (x) => {
    const c = x.crmVistoria || { tentativas: 0 }
    c.tentativas = (c.tentativas || 0) + 1
    c.ultimoErro = motivo.slice(0, 240)
    x.crmVistoria = c
  })
  const n = l?.crmVistoria?.tentativas ?? 0
  console.warn(`[Vistoria CRM] ${ref}: tentativa ${n} — ${motivo}`)
  if (l && n === MAX_TENTATIVAS) {
    void sendTelegramNotification(
      `⚠️ <b>Não consegui gerar sozinho o link da vistoria</b> — ${esc(l.nome)} (${esc(l.placa || 'sem placa')}).\nMotivo: ${esc(
        motivo
      )}\nGere no CRM 21Go e cole o link no /admin.`
    )
  }
}

/** Agendador: cadastros com documentos e sem link. */
export async function gerarLinksPendentes(): Promise<void> {
  if (!crmVistoriaEnabled()) return
  const pendentes = getStoredLeads().filter(
    (l) =>
      l.vistoriaData &&
      !l.appVistoUrl &&
      l.status === 'vistoria_enviada' &&
      (l.crmVistoria?.tentativas ?? 0) < MAX_TENTATIVAS &&
      Date.now() - new Date(l.createdAt).getTime() < 7 * 24 * 3600_000
  )
  for (const l of pendentes.slice(0, 5)) await gerarLinkVistoria(l.ref)
}
