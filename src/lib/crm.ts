import { LeadSubmissionPayload } from './types'

const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://www.crm21go.site/api'
const CRM_EMAIL = process.env.CRM_EMAIL || ''
const CRM_PASSWORD = process.env.CRM_PASSWORD || ''

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
  if (!CRM_EMAIL || !CRM_PASSWORD) {
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
    }

    // Login normal
    const loginRes = await fetch(`${CRM_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CRM_EMAIL, password: CRM_PASSWORD }),
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
 * Envia o Lead para o CRM 21 Go no funil Vendas Power
 */
export async function sendLeadToCrm(payload: LeadSubmissionPayload): Promise<{
  success: boolean
  cardId?: string
  message: string
}> {
  const token = await getCrmToken()

  // Se não configurou credenciais no .env, registra em log e simula sucesso
  if (!token) {
    console.warn(
      '[CRM Client] Operando em modo de demonstração: CRM_EMAIL e CRM_PASSWORD não definidos. O lead foi gerado para WhatsApp direto.'
    )
    return {
      success: true,
      cardId: `demo_${Date.now()}`,
      message: 'Lead registrado localmente (configure o .env com suas credenciais do CRM).',
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

      // Atualiza contato se possível
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
