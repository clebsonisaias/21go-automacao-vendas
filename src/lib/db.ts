import fs from 'fs'
import path from 'path'
import { LeadSubmissionPayload } from './types'

/** Cobrança Pix da taxa de adesão (Mercado Pago, Orders API). */
export interface LeadPagamento {
  provider: 'mercadopago'
  orderId: string
  paymentId?: string
  /** Status bruto do MP: action_required, processed, canceled, expired, failed... */
  status: string
  statusDetail?: string
  valor: number
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
  expiresAt?: string
  createdAt: string
  paidAt?: string
  /** Número da tentativa (nova cobrança se o Pix anterior expirar). */
  attempt: number
}

export interface StoredLead {
  id: string
  ref: string
  createdAt: string
  nome: string
  cpf?: string
  whatsapp: string
  email?: string
  cidade?: string
  uf?: string
  veiculoTrabalho?: boolean
  placa?: string
  planoEscolhidoId: string
  planoEscolhidoNome: string
  mensalidadeFinal: number
  ativacao: number
  comAdesivo: boolean
  vehicle: {
    marca: string
    modelo: string
    ano: string
    fipeValue: number
    fipeCode: string
    placa?: string
    tipo?: 'Carro' | 'Moto' | 'Caminhão'
    chassi?: string
    renavam?: string
    motor?: string
    cor?: string
    combustivel?: string
    valorProtegido?: number
  }
  powercrmCode?: string
  powerQuotationCode?: string
  powerQuotationId?: number
  powerNegotiationCode?: string
  checkoutUrl?: string
  crmNegociacaoId?: string
  diaVencimento?: number
  rawCrm?: Record<string, unknown>
  pagamento?: LeadPagamento
  /** Link da vistoria oficial (App Visto), gerado no CRM e colado no /admin. */
  appVistoUrl?: string
  appVistoEnviadoEm?: string
  /** Geração automática do link no CRM 21Go (ver crm-vistoria.ts). */
  crmVistoria?: { negId?: string; cotacaoId?: string; tentativas: number; ultimoErro?: string; lockAt?: string; docs?: string[] }
  status:
    | 'aguardando_pagamento'
    | 'adesao_paga'
    | 'pendente_vistoria'
    | 'vistoria_enviada'
    | 'aprovado'
    | 'cancelado'
    | 'em_negociacao'
    | 'cotacoes_recebidas'
    | 'vendas_concretizadas'
  /** Arquivos reais da vistoria gravados no servidor (ver vistoria-files.ts). */
  vistoriaArquivos?: Record<string, { ext: string; mime: string; size: number; originalName: string; savedAt: string }>
  vistoriaData?: {
    cnhOuRgNome?: string
    crlvNome?: string
    comprovanteResidenciaNome?: string
    totalFotos?: number
    enviadoEm?: string
  }
}

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const LEADS_FILE = path.join(DATA_DIR, 'leads.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]), 'utf-8')
  }
}

/** Grava a lista inteira de forma atômica (arquivo temporário + rename). */
export function writeLeads(leads: StoredLead[]): void {
  ensureDataFile()
  const tmp = `${LEADS_FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(leads, null, 2), 'utf-8')
  fs.renameSync(tmp, LEADS_FILE)
}

export function getStoredLeads(): StoredLead[] {
  try {
    ensureDataFile()
    const content = fs.readFileSync(LEADS_FILE, 'utf-8')
    return JSON.parse(content) as StoredLead[]
  } catch (err) {
    console.error('[DB] Erro ao ler leads:', err)
    return []
  }
}

export function findLeadByOrderId(orderId: string): StoredLead | undefined {
  return getStoredLeads().find((l) => l.pagamento?.orderId === orderId)
}

/** Leads com Pix emitido e ainda não pago (para conferência periódica). */
export function getLeadsAwaitingPayment(): StoredLead[] {
  return getStoredLeads().filter(
    (l) => Boolean(l.pagamento?.orderId && !l.pagamento.paidAt) && l.status !== 'cancelado'
  )
}

/** Aplica uma alteração a um lead (leitura+gravação síncronas: atômico dentro do processo). */
export function updateLead(
  ref: string,
  mutate: (lead: StoredLead) => void
): StoredLead | undefined {
  const leads = getStoredLeads()
  const lead = leads.find((l) => l.ref === ref)
  if (!lead) return undefined
  mutate(lead)
  writeLeads(leads)
  return lead
}

export function findLeadByRef(ref: string): StoredLead | undefined {
  return getStoredLeads().find((l) => l.ref === ref)
}

export function saveNewLead(
  payload: LeadSubmissionPayload,
  ref: string,
  powercrmCode?: string,
  initialStatus: StoredLead['status'] = 'pendente_vistoria'
): StoredLead {
  ensureDataFile()
  const leads = getStoredLeads()

  const newLead: StoredLead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ref,
    createdAt: new Date().toISOString(),
    nome: payload.nome,
    cpf: payload.cpf,
    whatsapp: payload.whatsapp,
    email: payload.email,
    cidade: payload.cidade,
    veiculoTrabalho: payload.veiculoTrabalho,
    placa: payload.placa || payload.vehicle.placa,
    planoEscolhidoId: payload.planoEscolhidoId,
    planoEscolhidoNome: payload.planoEscolhidoNome,
    mensalidadeFinal: payload.mensalidadeFinal,
    ativacao: payload.ativacao,
    comAdesivo: payload.comAdesivo,
    vehicle: {
      marca: payload.vehicle.marca,
      modelo: payload.vehicle.modelo,
      ano: String(payload.vehicle.ano),
      fipeValue: payload.vehicle.fipeValue,
      fipeCode: payload.vehicle.fipeCode,
      placa: payload.placa || payload.vehicle.placa,
    },
    powercrmCode,
    status: initialStatus,
  }

  leads.unshift(newLead)
  writeLeads(leads)
  return newLead
}

export function updateLeadVistoria(
  ref: string,
  vistoria: {
    cnhOuRgNome?: string
    crlvNome?: string
    comprovanteResidenciaNome?: string
    totalFotos?: number
  }
): boolean {
  try {
    ensureDataFile()
    const leads = getStoredLeads()
    const index = leads.findIndex((l) => l.ref === ref)

    if (index !== -1) {
      leads[index].status = 'vistoria_enviada'
      leads[index].vistoriaData = {
        ...vistoria,
        enviadoEm: new Date().toISOString(),
      }
      writeLeads(leads)
      return true
    }
    return false
  } catch (err) {
    console.error('[DB] Erro ao atualizar vistoria:', err)
    return false
  }
}
