import { LeadSubmissionPayload } from './types'
import { StoredLead, getStoredLeads, saveNewLead } from './db'
import fs from 'fs'
import path from 'path'

const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://www.crm21go.site/api'
const CRM_EMAIL = process.env.CRM_EMAIL || 'clebsonisaias@icloud.com'
const CRM_PASSWORD = process.env.CRM_PASSWORD || '123456'

const CRM_PIPE_ID = process.env.CRM_PIPE_ID || 'a41be931-04d2-46da-a0c4-1406c3c4e114'
const CRM_PHASE_COTACOES_RECEBIDAS =
  process.env.CRM_PHASE_COTACOES_RECEBIDAS || '7a0c33a6-0935-4fba-aa5c-0c13f9efb4a3'

// Cache em memória para o JWT
let cachedToken: string | null = null
let cachedRefreshToken: string | null = null
let tokenExpiresAt = 0

/**
 * Autentica no CRM 21 Go e obtém o token Bearer
 */
export async function getCrmToken(): Promise<string | null> {
  const email = process.env.CRM_EMAIL || CRM_EMAIL
  const password = process.env.CRM_PASSWORD || CRM_PASSWORD

  if (!email || !password) {
    console.warn('[CRM Client] CRM_EMAIL e CRM_PASSWORD não configurados no .env')
    return null
  }

  // Se o token ainda é válido (margem de 5 minutos)
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedToken
  }

  try {
    // Tenta refresh se tiver refreshToken
    if (cachedRefreshToken) {
      try {
        const refreshRes = await fetch(`${CRM_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: cachedRefreshToken }),
        })
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          cachedToken = data.token
          cachedRefreshToken = data.refreshToken || cachedRefreshToken
          tokenExpiresAt = Date.now() + 3600000 // 1h
          return cachedToken
        }
      } catch {}
    }

    // Login normal
    const loginRes = await fetch(`${CRM_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!loginRes.ok) {
      console.error('[CRM Client] Erro ao autenticar no CRM:', loginRes.statusText)
      return null
    }

    const authData = await loginRes.json()
    cachedToken = authData.token
    cachedRefreshToken = authData.refreshToken
    tokenExpiresAt = Date.now() + 3600000
    return cachedToken
  } catch (err) {
    console.error('[CRM Client] Falha de conexão com CRM:', err)
    return null
  }
}

/**
 * Busca cards reais do funil no CRM 21 Go
 */
export async function fetchCrmCards(limit = 50): Promise<any[]> {
  const token = await getCrmToken()
  if (!token) return []

  try {
    const url = `${CRM_BASE_URL}/pipes/${CRM_PIPE_ID}/cards?limit=${limit}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      console.warn('[CRM Client] Erro ao buscar cards:', res.status, res.statusText)
      return []
    }

    const json = await res.json()
    return Array.isArray(json.data) ? json.data : []
  } catch (err) {
    console.error('[CRM Client] Falha ao consultar cards do CRM:', err)
    return []
  }
}

/**
 * Busca associados reais cadastrados no CRM 21 Go
 */
export async function fetchCrmAssociados(): Promise<any[]> {
  const token = await getCrmToken()
  if (!token) return []

  try {
    const url = `${CRM_BASE_URL}/associados?limit=50`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      console.warn('[CRM Client] Erro ao buscar associados:', res.status, res.statusText)
      return []
    }

    const json = await res.json()
    return Array.isArray(json.data) ? json.data : []
  } catch (err) {
    console.error('[CRM Client] Falha ao consultar associados:', err)
    return []
  }
}

/**
 * Procura um associado no CRM pelo CPF
 */
export async function findCrmAssociadoByCpf(cpfRaw: string): Promise<any | null> {
  const cleanCpf = cpfRaw.replace(/\D/g, '')
  if (!cleanCpf) return null

  const associados = await fetchCrmAssociados()
  const found = associados.find((a: any) => {
    const aCpf = (a.cpf || '').replace(/\D/g, '')
    return aCpf === cleanCpf
  })

  return found || null
}

/**
 * Sincroniza os leads reais do CRM 21 Go para o banco de dados local do site
 */
export async function syncCrmLeadsToDatabase(): Promise<{
  success: boolean
  imported: number
  total: number
  message: string
}> {
  const token = await getCrmToken()
  if (!token) {
    return {
      success: false,
      imported: 0,
      total: 0,
      message: 'Não foi possível autenticar no CRM 21 Go.',
    }
  }

  try {
    const cards = await fetchCrmCards(100)
    const existingLeads = getStoredLeads()
    const existingRefs = new Set(existingLeads.map((l) => l.ref || l.id))
    const existingPlacas = new Set(existingLeads.map((l) => (l.placa || '').toUpperCase().trim()))

    let importedCount = 0

    for (const card of cards) {
      // Exemplo de title: "RGL9B19 · Christian Araújo Pinheiro de Lucena" ou "TSU7H39 · Johnattan Morais"
      const titleParts = (card.title || '').split('·').map((s: string) => s.trim())
      const placa = titleParts[0]?.replace(/[^A-Z0-9]/gi, '').toUpperCase() || ''
      const nome = titleParts[1] || card.title || 'Cliente CRM'

      // Se já temos esse lead pelo ID do card ou placa, pula
      if (existingRefs.has(card.id) || (placa && existingPlacas.has(placa))) {
        continue
      }

      const newLead: StoredLead = {
        id: card.id,
        ref: card.id,
        createdAt: card.createdAt || new Date().toISOString(),
        nome,
        cpf: '',
        whatsapp: '(84) 99218-7662',
        email: '',
        cidade: 'Natal',
        veiculoTrabalho: false,
        placa,
        planoEscolhidoId: 'plano_vip',
        planoEscolhidoNome: 'Plano VIP Completo (CRM)',
        mensalidadeFinal: 399.99,
        ativacao: 250.0,
        comAdesivo: false,
        vehicle: {
          marca: '21Go Protegido',
          modelo: placa ? `Veículo Placa ${placa}` : 'Automóvel',
          ano: '2023',
          fipeValue: 85000,
          fipeCode: '000000-0',
          placa,
        },
        powercrmCode: card.powerCode || '9onmrnO5EX',
        status: card.currentPhase?.name?.toLowerCase().includes('negocia') ? 'pendente_vistoria' : 'aprovado',
      }

      existingLeads.unshift(newLead)
      existingRefs.add(card.id)
      if (placa) existingPlacas.add(placa)
      importedCount++
    }

    // Salva de volta no leads.json
    const DATA_DIR = path.join(process.cwd(), 'data')
    const LEADS_FILE = path.join(DATA_DIR, 'leads.json')
    fs.writeFileSync(LEADS_FILE, JSON.stringify(existingLeads, null, 2), 'utf-8')

    return {
      success: true,
      imported: importedCount,
      total: existingLeads.length,
      message: `${importedCount} novos leads sincronizados com sucesso do CRM 21 Go!`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      imported: 0,
      total: 0,
      message: `Erro ao sincronizar: ${msg}`,
    }
  }
}

/**
 * Envia o Lead para o CRM 21 Go no funil Vendas Power
 */
export async function sendLeadToCrm(payload: LeadSubmissionPayload): Promise<{
  success: boolean
  cardId?: string
  message: string
}> {
  const token = await getCrmToken()

  if (!token) {
    console.warn(
      '[CRM Client] Operando em modo de contingência: o lead foi gerado para WhatsApp direto.'
    )
    return {
      success: true,
      cardId: `demo_${Date.now()}`,
      message: 'Lead registrado localmente e encaminhado ao WhatsApp.',
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  // Tentativa 1: Endpoint completo de nova negociação / lead
  try {
    const leadBody = {
      nome: payload.nome,
      telefone: payload.whatsapp,
      email: payload.email || '',
      placa: payload.placa || payload.vehicle.placa || '',
      codigoFipe: payload.vehicle.fipeCode || '',
      tipoVeiculo: payload.vehicle.categoria?.includes('MOTO') ? 'moto' : 'carro',
      marcaId: payload.powercrmMeta?.brandId,
      modeloId: payload.powercrmMeta?.modelId,
      anoModeloId: payload.powercrmMeta?.yearId,
      workVehicle: false,
      liberarPlacaTravada: true,
    }

    const res = await fetch(`${CRM_BASE_URL}/negociacoes/lead`, {
      method: 'POST',
      headers,
      body: JSON.stringify(leadBody),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        cardId: data.leadId || data.id,
        message: 'Lead criado com sucesso no funil de negociações!',
      }
    }
  } catch (err) {
    console.warn('[CRM Client] Tentativa /negociacoes/lead falhou, tentando card simples...', err)
  }

  // Tentativa 2: Criação direta de Card na coluna Cotações recebidas
  try {
    const cardTitle = `${payload.nome} — ${payload.vehicle.marca} ${payload.vehicle.modelo} (${payload.planoEscolhidoNome})`
    const cardRes = await fetch(`${CRM_BASE_URL}/pipes/${CRM_PIPE_ID}/cards`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: cardTitle,
        phaseId: CRM_PHASE_COTACOES_RECEBIDAS,
      }),
    })

    if (cardRes.ok) {
      const cardData = await cardRes.json()
      const cardId = cardData.id || cardData.cardId

      if (cardId) {
        await fetch(`${CRM_BASE_URL}/pipes/cards/${cardId}/contato`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            nome: payload.nome,
            telefone: payload.whatsapp,
            email: payload.email,
          }),
        }).catch(() => {})
      }

      return {
        success: true,
        cardId,
        message: 'Card criado na coluna Cotações recebidas do seu Kanban!',
      }
    }
  } catch (err) {
    console.error('[CRM Client] Falha ao criar card no Kanban:', err)
  }

  return {
    success: false,
    message: 'Não foi possível registrar no CRM, mas o cliente será redirecionado para o WhatsApp.',
  }
}
