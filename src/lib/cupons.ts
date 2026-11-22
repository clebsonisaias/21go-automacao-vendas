import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from '@/lib/db'
import type { CupomAplicado } from '@/lib/types'

export type { CupomAplicado }

/**
 * Cupons de desconto na taxa de adesão (`ativacao`), criados no /admin.
 *
 * O desconto é aplicado no servidor, sobre o valor assinado da cotação, antes de o
 * cadastro ser gravado: daí em diante tudo (Pix, conferência do pagamento, WhatsApp,
 * e-mail, Telegram, painel) usa `lead.ativacao` já com o desconto. Depois que o Pix
 * existe, a adesão não muda mais (a ordem do Mercado Pago é do valor antigo).
 */

export type TipoCupom = 'valor' | 'percentual'

export interface Cupom {
  id: string
  /** Maiúsculas: letras, números e hífen. */
  codigo: string
  descricao?: string
  tipo: TipoCupom
  /** Percentual: 1 a 100. Valor: reais, acima de 0. */
  desconto: number
  /** Período em que vale (AAAA-MM-DD, dia inteiro, horário de Brasília). */
  inicio?: string
  fim?: string
  /** null = sem limite; 1 = vale uma vez só. */
  maxUsos: number | null
  usos: number
  /** Cadastros que usaram (ref do lead): o mesmo cadastro não conta duas vezes. */
  leads: string[]
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

const ARQUIVO = path.join(DATA_DIR, 'cupons.json')
const CODIGO = /^[A-Z0-9][A-Z0-9-]{1,28}[A-Z0-9]$/
const DATA = /^\d{4}-\d{2}-\d{2}$/

export function normalizarCodigo(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 40)
}

export function lerCupons(): Cupom[] {
  try {
    const d = JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'))
    return Array.isArray(d) ? (d as Cupom[]) : []
  } catch {
    return []
  }
}

function gravarCupons(cupons: Cupom[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${ARQUIVO}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(cupons, null, 2), 'utf-8')
  fs.renameSync(tmp, ARQUIVO)
}

/** Dia de hoje em Brasília (AAAA-MM-DD), para comparar com início e fim do cupom. */
export function hojeBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)
}

const centavos = (v: number) => Math.round(v * 100) / 100

/** Quanto o cupom tira da adesão; a adesão nunca fica abaixo de zero. */
export function calcularDesconto(ativacao: number, cupom: Pick<Cupom, 'tipo' | 'desconto'>) {
  const base = centavos(Math.max(0, ativacao))
  const bruto = cupom.tipo === 'percentual' ? (base * cupom.desconto) / 100 : cupom.desconto
  const valorDesconto = centavos(Math.min(base, Math.max(0, bruto)))
  return { valorDesconto, ativacaoFinal: centavos(base - valorDesconto) }
}

/** Texto curto do desconto, para o cliente e para o painel. */
export function descreverDesconto(c: Pick<Cupom, 'tipo' | 'desconto'>): string {
  if (c.tipo === 'percentual') return c.desconto >= 100 ? 'adesão grátis' : `${c.desconto}% na adesão`
  return `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.desconto)} na adesão`
}

/** Por que o cupom não pode ser usado agora (texto para o cliente), ou null se pode. */
function motivoRecusa(c: Cupom | undefined, hoje: string, chaveDoLead?: string): string | null {
  if (!c) return 'Cupom não encontrado. Confira o código digitado.'
  if (!c.ativo) return 'Este cupom não está mais ativo.'
  if (c.inicio && hoje < c.inicio) return 'Este cupom ainda não começou a valer.'
  if (c.fim && hoje > c.fim) return 'Este cupom venceu.'
  const jaUsadoPorEste = chaveDoLead ? c.leads.includes(chaveDoLead) : false
  if (!jaUsadoPorEste && c.maxUsos !== null && c.usos >= c.maxUsos) return 'Este cupom já foi usado.'
  return null
}

export function conferirCupom(
  codigo: string,
  agora = new Date()
): { ok: true; cupom: Cupom } | { ok: false; motivo: string } {
  const cod = normalizarCodigo(codigo)
  const c = lerCupons().find((x) => x.codigo === cod)
  const motivo = motivoRecusa(c, hojeBrasilia(agora))
  return motivo ? { ok: false, motivo } : { ok: true, cupom: c! }
}

/**
 * Reserva um uso do cupom para este cadastro: confere e soma de uma vez só (leitura e
 * gravação síncronas, atômico dentro do processo). O mesmo cadastro não conta duas vezes.
 */
export function reservarCupom(
  codigo: string,
  chaveDoLead: string,
  agora = new Date()
): { ok: true; cupom: Cupom } | { ok: false; motivo: string } {
  const cod = normalizarCodigo(codigo)
  const cupons = lerCupons()
  const c = cupons.find((x) => x.codigo === cod)
  const motivo = motivoRecusa(c, hojeBrasilia(agora), chaveDoLead)
  if (motivo) return { ok: false, motivo }
  if (!c!.leads.includes(chaveDoLead)) {
    c!.leads.push(chaveDoLead)
    c!.usos += 1
    c!.atualizadoEm = agora.toISOString()
    gravarCupons(cupons)
  }
  return { ok: true, cupom: c! }
}

/** Desfaz a reserva (o cadastro falhou ou o cupom saiu do cadastro). */
export function liberarCupom(codigo: string, chaveDoLead: string): void {
  const cod = normalizarCodigo(codigo)
  const cupons = lerCupons()
  const c = cupons.find((x) => x.codigo === cod)
  if (!c || !c.leads.includes(chaveDoLead)) return
  c.leads = c.leads.filter((l) => l !== chaveDoLead)
  c.usos = Math.max(0, c.usos - 1)
  c.atualizadoEm = new Date().toISOString()
  gravarCupons(cupons)
}

/* ------------------------------------------------------------------------- */
/* Administração (aba Cupons do /admin).                                     */
/* ------------------------------------------------------------------------- */

export interface DadosCupom {
  codigo: string
  descricao?: string
  tipo: TipoCupom
  desconto: number
  inicio?: string
  fim?: string
  maxUsos: number | null
  ativo: boolean
}

/** Confere o que veio do formulário do /admin. Devolve os dados limpos ou o erro. */
export function validarDadosCupom(b: any): { ok: true; dados: DadosCupom } | { ok: false; erro: string } {
  const codigo = normalizarCodigo(b?.codigo)
  if (!CODIGO.test(codigo)) {
    return { ok: false, erro: 'Código com 3 a 30 caracteres: letras, números e hífen (ex.: AMIGO21).' }
  }
  const tipo: TipoCupom = b?.tipo === 'valor' ? 'valor' : b?.tipo === 'percentual' ? 'percentual' : ('' as TipoCupom)
  if (!tipo) return { ok: false, erro: 'Escolha o tipo do desconto: valor em R$ ou porcentagem.' }
  const desconto = Number(b?.desconto)
  if (!Number.isFinite(desconto) || desconto <= 0) return { ok: false, erro: 'Informe o desconto, maior que zero.' }
  if (tipo === 'percentual' && desconto > 100) return { ok: false, erro: 'A porcentagem vai de 1 a 100 (100 = adesão grátis).' }
  if (tipo === 'valor' && desconto > 100000) return { ok: false, erro: 'Valor de desconto alto demais.' }
  const inicio = typeof b?.inicio === 'string' && b.inicio ? b.inicio : undefined
  const fim = typeof b?.fim === 'string' && b.fim ? b.fim : undefined
  if ((inicio && !DATA.test(inicio)) || (fim && !DATA.test(fim))) return { ok: false, erro: 'Data inválida.' }
  if (inicio && fim && fim < inicio) return { ok: false, erro: 'A data final vem antes da inicial.' }
  let maxUsos: number | null = null
  if (b?.maxUsos !== null && b?.maxUsos !== undefined && b?.maxUsos !== '') {
    const n = Number(b.maxUsos)
    if (!Number.isInteger(n) || n < 1 || n > 1000000) return { ok: false, erro: 'Limite de usos: um número inteiro, 1 ou mais.' }
    maxUsos = n
  }
  const descricao = typeof b?.descricao === 'string' ? b.descricao.trim().slice(0, 120) || undefined : undefined
  return {
    ok: true,
    dados: {
      codigo,
      descricao,
      tipo,
      desconto: Math.round(desconto * 100) / 100,
      inicio,
      fim,
      maxUsos,
      ativo: b?.ativo !== false,
    },
  }
}

export function criarCupom(dados: DadosCupom): { ok: true; cupom: Cupom } | { ok: false; erro: string } {
  const cupons = lerCupons()
  if (cupons.some((c) => c.codigo === dados.codigo)) return { ok: false, erro: 'Já existe um cupom com este código.' }
  const agora = new Date().toISOString()
  const cupom: Cupom = {
    id: `cup_${crypto.randomBytes(6).toString('hex')}`,
    ...dados,
    usos: 0,
    leads: [],
    criadoEm: agora,
    atualizadoEm: agora,
  }
  cupons.unshift(cupom)
  gravarCupons(cupons)
  return { ok: true, cupom }
}

export function atualizarCupom(id: string, dados: DadosCupom): { ok: true; cupom: Cupom } | { ok: false; erro: string; status: number } {
  const cupons = lerCupons()
  const c = cupons.find((x) => x.id === id)
  if (!c) return { ok: false, erro: 'Cupom não encontrado.', status: 404 }
  if (dados.codigo !== c.codigo) {
    // Cupom já usado mantém o código: o cadastro guarda o código que o cliente digitou.
    if (c.usos > 0) return { ok: false, erro: 'Cupom já usado não muda de código. Crie outro.', status: 409 }
    if (cupons.some((x) => x.id !== id && x.codigo === dados.codigo)) {
      return { ok: false, erro: 'Já existe um cupom com este código.', status: 409 }
    }
  }
  Object.assign(c, dados, { atualizadoEm: new Date().toISOString() })
  gravarCupons(cupons)
  return { ok: true, cupom: c }
}

export function ligarCupom(id: string, ativo: boolean): Cupom | null {
  const cupons = lerCupons()
  const c = cupons.find((x) => x.id === id)
  if (!c) return null
  c.ativo = ativo
  c.atualizadoEm = new Date().toISOString()
  gravarCupons(cupons)
  return c
}

/** Só apaga cupom nunca usado; usado, o painel só deixa desligar. */
export function excluirCupom(id: string): { ok: true } | { ok: false; erro: string; status: number } {
  const cupons = lerCupons()
  const c = cupons.find((x) => x.id === id)
  if (!c) return { ok: false, erro: 'Cupom não encontrado.', status: 404 }
  if (c.usos > 0) return { ok: false, erro: 'Cupom já usado não pode ser excluído; desligue-o.', status: 409 }
  gravarCupons(cupons.filter((x) => x.id !== id))
  return { ok: true }
}
