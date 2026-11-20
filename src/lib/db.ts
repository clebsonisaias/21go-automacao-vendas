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
  }
  powercrmCode?: string
  status: 'pendente_vistoria' | 'vistoria_enviada' | 'aprovado' | 'cancelado'
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

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]), 'utf-8')
  }
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
    const index = leads.findIndex((l) => l.ref === ref || l.id === ref)

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
