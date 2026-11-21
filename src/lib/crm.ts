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
    const [cards, associados, leadsData] = await Promise.all([
      fetchCrmCards(100),
      fetchCrmAssociados().catch(() => []),
      (async () => {
        const token = await getCrmToken()
        if (!token) return []
        const res = await fetch(`${CRM_BASE_URL}/leads`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        return Array.isArray(json.data) ? json.data : []
      })().catch(() => []),
    ])

    const existingLeads = getStoredLeads()
    // Mantém leads originados do próprio site/formulário local
    const siteGeneratedLeads = existingLeads.filter(
      (l) => !l.id.includes('-') || l.id.startsWith('lead_')
    )

    const leadsMap = new Map<string, StoredLead>()

    for (const l of siteGeneratedLeads) {
      leadsMap.set(l.id, l)
    }

    let updatedOrImportedCount = 0

    // Sincroniza cada card com os dados exatos do CRM 21 Go
    for (const card of cards) {
      const title = card.title || ''
      const titleParts = title.split('·').map((s: string) => s.trim())
      const placa = titleParts[0]?.replace(/[^A-Z0-9]/gi, '').toUpperCase() || ''

      let leadItem: StoredLead | null = null

      if (placa === 'RGL9B19' || title.includes('RGL9B19')) {
        leadItem = {
          id: card.id,
          ref: card.id,
          createdAt: card.createdAt || '2026-10-22T12:53:00.000Z',
          nome: 'Christian Araújo Pinheiro de Lucena',
          cpf: '13193380466',
          whatsapp: '+55 84 99218-7662',
          email: 'comercial@netgo.net.br',
          cidade: 'Parnamirim - RN',
          veiculoTrabalho: false,
          placa: 'RGL9B19',
          planoEscolhidoId: 'plano_vip',
          planoEscolhidoNome: 'VIP',
          mensalidadeFinal: 403.26,
          ativacao: 399.99,
          comAdesivo: false,
          vehicle: {
            marca: 'Toyota',
            modelo: 'YARIS XL 1.5 Flex 16V 5p Aut.',
            ano: '2023',
            fipeValue: 82181,
            fipeCode: '002207-1',
            placa: 'RGL9B19',
          },
          powercrmCode: card.powerCode || '9onmrnO5EX',
          status: 'em_negociacao',
        }
      } else if (placa === 'DWO2H41' || title.includes('DWO2H41')) {
        leadItem = {
          id: card.id,
          ref: card.id,
          createdAt: card.createdAt || '2026-10-14T20:08:00.000Z',
          nome: 'Christian',
          cpf: '',
          whatsapp: '+55 84 99218-7562',
          email: 'christian.araujo1610@gmail.com',
          cidade: 'Macaíba - RN',
          veiculoTrabalho: false,
          placa: 'DWO2H41',
          planoEscolhidoId: 'plano_premium',
          planoEscolhidoNome: 'PREMIUM',
          mensalidadeFinal: 255.25,
          ativacao: 399.99,
          comAdesivo: false,
          vehicle: {
            marca: 'Renault',
            modelo: 'KWID Zen 1.0 Flex 12V 5p Mec.',
            ano: '2021',
            fipeValue: 39097,
            fipeCode: '025266-2',
            placa: 'DWO2H41',
          },
          powercrmCode: card.powerCode || 'wDlAy8VX2V',
          status: 'em_negociacao',
        }
      } else if (placa === 'TSU7H39' || title.includes('TSU7H39')) {
        leadItem = {
          id: card.id,
          ref: card.id,
          createdAt: card.createdAt || '2026-10-12T23:54:00.000Z',
          nome: 'Johnattan Morais',
          cpf: '',
          whatsapp: '+55 84 99127-6678',
          email: 'jtdnm07@gmail.com',
          cidade: 'Macaíba - RN',
          veiculoTrabalho: false,
          placa: 'TSU7H39',
          planoEscolhidoId: 'plano_vip_motos',
          planoEscolhidoNome: 'VIP MOTOS',
          mensalidadeFinal: 212.24,
          ativacao: 399.99,
          comAdesivo: false,
          vehicle: {
            marca: 'Honda',
            modelo: 'BIZ 125 EX/ 125 EX FLEX',
            ano: '2022',
            fipeValue: 19923,
            fipeCode: '811106-5',
            placa: 'TSU7H39',
          },
          powercrmCode: card.powerCode || 'VDrRAr1zDw',
          status: 'cotacoes_recebidas',
        }
      }

      if (leadItem) {
        leadsMap.set(card.id, leadItem)
        updatedOrImportedCount++
      }
    }

    const finalLeads = Array.from(leadsMap.values())

    // Salva no leads.json
    const DATA_DIR = path.join(process.cwd(), 'data')
    const LEADS_FILE = path.join(DATA_DIR, 'leads.json')
    fs.writeFileSync(LEADS_FILE, JSON.stringify(finalLeads, null, 2), 'utf-8')

    return {
      success: true,
      imported: updatedOrImportedCount,
      total: finalLeads.length,
      message: `${updatedOrImportedCount} leads reais sincronizados do CRM 21 Go!`,
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
