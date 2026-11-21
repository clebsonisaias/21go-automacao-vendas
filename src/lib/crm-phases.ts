/**
 * Fases do funil Vendas Power no CRM 21Go
 */
export const CRM_PHASES = {
  COTACOES_RECEBIDAS: '7a0c33a6-0935-4fba-aa5c-0c13f9efb4a3',
  EM_NEGOCIACAO: 'a6a56a07-ebd6-4868-a929-0ebbfd6dbc20',
  VISTORIAS: '5397b4ff-b878-4f82-b505-dd6c27695392',
  LIBERADAS_CADASTRO: 'd3b06d15-bbce-4e49-a756-12e5d1bd0349',
  VENDAS_CONCRETIZADAS: '69a6c60c-048d-437e-9652-ed185c83c9f8',
} as const

export type CrmPhase = keyof typeof CRM_PHASES

const CRM = (process.env.CRM_BASE_URL || 'https://www.crm21go.site/api').replace(/\/+$/, '')

let token: string | null = null
let tokenAt = 0

async function login(): Promise<string> {
  const res = await fetch(`${CRM}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.CRM_EMAIL,
      password: process.env.CRM_PASSWORD,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) throw new Error('Login falhou')
  const newToken = String(data.token)
  token = newToken
  tokenAt = Date.now()
  return newToken
}

async function getToken(): Promise<string> {
  if (token && Date.now() - tokenAt < 50 * 60_000) return token
  return login()
}

/**
 * Move um card para uma fase específica do Kanban
 */
export async function moverCard(cardId: string, phase: CrmPhase): Promise<boolean> {
  try {
    const t = await getToken()
    const phaseId = CRM_PHASES[phase]

    const res = await fetch(`${CRM}/pipes/cards/${cardId}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ phaseId }),
    })

    if (res.ok) {
      console.log(`[CRM] Card ${cardId} movido para ${phase}`)
      return true
    }

    console.warn(`[CRM] Falha ao mover card ${cardId}:`, res.status)
    return false
  } catch (err) {
    console.error('[CRM] Erro ao mover card:', err)
    return false
  }
}

/**
 * Busca o cardId de uma negociação
 */
export async function getCardIdFromNegociacao(negId: string): Promise<string | null> {
  try {
    const t = await getToken()
    const res = await fetch(`${CRM}/negociacoes/${negId}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.cardId || null
  } catch {
    return null
  }
}
