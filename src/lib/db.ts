import fs from 'fs'
import path from 'path'
import { LeadSubmissionPayload } from './types'

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
  status:
    | 'pendente_vistoria'
    | 'vistoria_enviada'
    | 'aprovado'
    | 'cancelado'
    | 'em_negociacao'
    | 'cotacoes_recebidas'
    | 'vendas_concretizadas'
  vistoriaData?: {
    cnhOuRgNome?: string
    crlvNome?: string
    comprovanteResidenciaNome?: string
    totalFotos?: number
    enviadoEm?: string
  }
}

const DATA_DIR = path.join(process.cwd(), 'data')
const LEADS_FILE = path.join(DATA_DIR, 'leads.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]), 'utf-8')
  }
}

export function getAdminPassword(): string {
  try {
    ensureDataFile()
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const cfg = JSON.parse(content)
      if (cfg.adminPassword) return String(cfg.adminPassword)
    }
  } catch {}
  return process.env.ADMIN_PASSWORD || 'Gael@1'
}

export function saveAdminPassword(newPassword: string): boolean {
  try {
    ensureDataFile()
    let cfg: Record<string, unknown> = {}
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      } catch {}
    }
    cfg.adminPassword = newPassword
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8')
    process.env.ADMIN_PASSWORD = newPassword
    return true
  } catch (err) {
    console.error('Erro ao salvar nova senha:', err)
    return false
  }
}

// Inicializa a senha salva no process.env na inicialização
try {
  const initPass = getAdminPassword()
  if (initPass && process.env) {
    process.env.ADMIN_PASSWORD = initPass
  }
} catch {}

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

export function findLeadByRef(ref: string): StoredLead | undefined {
  return getStoredLeads().find((l) => l.ref === ref)
}

export function saveNewLead(payload: LeadSubmissionPayload, ref: string, powercrmCode?: string): StoredLead {
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
    status: 'pendente_vistoria',
  }

  leads.unshift(newLead)
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8')
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
      fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8')
      return true
    }
    return false
  } catch (err) {
    console.error('[DB] Erro ao atualizar vistoria:', err)
    return false
  }
}
