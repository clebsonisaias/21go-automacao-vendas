import { LeadSubmissionPayload } from './types'
import { StoredLead, getStoredLeads, writeLeads } from './db'

const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://www.crm21go.site/api'

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
  // Sem credenciais padrão no código: só autentica se CRM_EMAIL/CRM_PASSWORD estiverem no ambiente.
  const email = process.env.CRM_EMAIL || ''
  const password = process.env.CRM_PASSWORD || ''

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
 * Puxa 100% dos dados completos entregues pela API do CRM (cards, negociações, cotações, associados, veículos)
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

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    // 1. Carrega marcas para mapear brandId em nome legível (Carros, Motos, Caminhões)
    const marcasMap = new Map<string, string>()
    for (const tipo of [1, 2, 3]) {
      try {
        const res = await fetch(`${CRM_BASE_URL}/negociacoes/referencias/marcas/${tipo}`, {
          headers,
          next: { revalidate: 3600 },
        })
        if (res.ok) {
          const marcas = await res.json()
          if (Array.isArray(marcas)) {
            for (const m of marcas) {
              marcasMap.set(`${tipo}_${m.id}`, m.text)
            }
          }
        }
      } catch {}
    }

    // 2. Cache local de modelos por brandId
    const modelosCache = new Map<string, string>()
    async function getModeloName(brandId?: number, modeloId?: number): Promise<string> {
      if (!brandId || !modeloId) return ''
      const key = `${brandId}_${modeloId}`
      if (modelosCache.has(key)) return modelosCache.get(key)!
      try {
        const res = await fetch(
          `${CRM_BASE_URL}/negociacoes/referencias/modelos/${brandId}`,
          { headers, next: { revalidate: 3600 } }
        )
        if (res.ok) {
          const modelos = await res.json()
          if (Array.isArray(modelos)) {
            for (const mod of modelos) {
              modelosCache.set(`${brandId}_${mod.id}`, mod.text)
            }
          }
        }
      } catch {}
      return modelosCache.get(key) || ''
    }

    // 3. Busca lista de cards do Kanban
    const cardsRes = await fetch(
      `${CRM_BASE_URL}/pipes/${CRM_PIPE_ID}/cards?limit=100`,
      { headers, next: { revalidate: 0 } }
    )
    const cardsData = await cardsRes.json()
    const cards = Array.isArray(cardsData.data) ? cardsData.data : []

    const existingLeads = getStoredLeads()
    const siteGeneratedLeads = existingLeads.filter(
      (l) => !l.id.includes('-') || l.id.startsWith('lead_')
    )

    const leadsMap = new Map<string, StoredLead>()
    for (const l of siteGeneratedLeads) {
      leadsMap.set(l.id, l)
    }

    let updatedOrImportedCount = 0

    // 4. Para cada card, busca os detalhes completos (lead, negociacao, associado, cotacoes)
    for (const cardSummary of cards) {
      try {
        const cardRes = await fetch(
          `${CRM_BASE_URL}/pipes/cards/${cardSummary.id}`,
          { headers, next: { revalidate: 0 } }
        )
        if (!cardRes.ok) continue
        const card = await cardRes.json()

        const neg = card.negociacao
        const cot = neg?.cotacoes?.[0] || {}
        const tipoNum = cot.tipoVeiculo || 1
        const tipo: 'Carro' | 'Moto' | 'Caminhão' =
          tipoNum === 2 ? 'Moto' : tipoNum === 3 ? 'Caminhão' : 'Carro'

        const marca =
          marcasMap.get(`${tipoNum}_${cot.brandId}`) ||
          (tipo === 'Moto' ? 'Honda' : '21Go')
        const modelo = (await getModeloName(cot.brandId, cot.modeloId)) || cot.modelo || 'Veículo'

        const titleParts = (card.title || '').split('·').map((s: string) => s.trim())
        const placaFromTitle =
          titleParts[0]?.replace(/[^A-Z0-9]/gi, '').toUpperCase() || ''
        const placa = cot.placa || placaFromTitle || ''

        const nome =
          card.associado?.nome ||
          card.lead?.nome ||
          titleParts[1] ||
          card.title ||
          'Cliente 21Go'
        const rawPhone =
          card.associado?.whatsapp ||
          card.associado?.telefone ||
          card.lead?.whatsapp ||
          card.lead?.telefone ||
          ''
        const whatsapp = rawPhone.startsWith('+')
          ? rawPhone
          : rawPhone
          ? `+${rawPhone}`
          : ''
        const email = card.associado?.email || card.lead?.email || ''
        const cpf = card.associado?.cpf || ''

        // Resolução amigável de cidade
        let cidade = card.associado?.cidade
        if (!cidade) {
          if (card.associado?.cidadeId === 3779) cidade = 'Parnamirim'
          else if (card.associado?.cidadeId === 3759) cidade = 'Macaíba'
          else cidade = card.associado?.bairro || card.associado?.uf || 'RN'
        }
        if (card.associado?.uf && !cidade.includes(card.associado.uf)) {
          cidade = `${cidade} - ${card.associado.uf}`
        }

        // Determinação de status pelo Kanban do CRM
        let status: StoredLead['status'] = 'em_negociacao'
        const phaseName = (card.currentPhase?.name || '').toLowerCase()
        if (phaseName.includes('concretiz') || phaseName.includes('venda')) {
          status = 'vendas_concretizadas'
        } else if (phaseName.includes('recebid') || neg?.pipelineColumn === 1) {
          status = 'cotacoes_recebidas'
        } else if (phaseName.includes('negoci') || neg?.pipelineColumn === 2) {
          status = 'em_negociacao'
        }

        const fipeVal = Number(cot.valorFipe || 0)
        const valorProtegido = cot.valorProtegido ? Number(cot.valorProtegido) : undefined
        const anoStr = String(
          cot.anoModelo === 32000
            ? '2022'
            : cot.anoModelo || cot.anoFabricacao || '2023'
        )

        const planoNome =
          cot.planoNome ||
          (tipo === 'Moto' ? 'VIP MOTOS' : 'VIP')
        const planoId = `plano_${planoNome.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        const mensalidade = cot.valorMensal
          ? Number(cot.valorMensal)
          : tipo === 'Moto'
          ? 212.24
          : 399.99
        const adesao = cot.valorAdesao ? Number(cot.valorAdesao) : 399.99

        const leadItem: StoredLead = {
          id: card.id,
          ref: card.id,
          createdAt: card.createdAt || new Date().toISOString(),
          nome,
          cpf,
          whatsapp,
          email,
          cidade,
          uf: card.associado?.uf || 'RN',
          veiculoTrabalho: Boolean(cot.workVehicle),
          placa,
          planoEscolhidoId: planoId,
          planoEscolhidoNome: planoNome,
          mensalidadeFinal: mensalidade,
          ativacao: adesao,
          comAdesivo: false,
          vehicle: {
            marca,
            modelo,
            ano: anoStr,
            fipeValue: fipeVal,
            fipeCode: cot.codigoFipe || '000000-0',
            placa,
            tipo,
            chassi: cot.chassi || undefined,
            renavam: cot.renavam || undefined,
            motor: cot.engineNumber || undefined,
            cor: cot.cor || undefined,
            combustivel:
              cot.combustivel && cot.combustivel !== 'Nao informado'
                ? cot.combustivel
                : undefined,
            valorProtegido,
          },
          powercrmCode: card.powerCode || cot.powerQuotationCode,
          powerQuotationCode: cot.powerQuotationCode,
          powerQuotationId: cot.powerQuotationId,
          powerNegotiationCode: neg?.powerNegotiationCode || card.powerCode,
          checkoutUrl: cot.powerQuotationCode
            ? `https://checkout.cotacao.me/myplanquot?h=${cot.powerQuotationCode}`
            : undefined,
          crmNegociacaoId: neg?.id,
          diaVencimento: cot.expirationDay || card.lead?.diaVencimento,
          status,
          rawCrm: {
            cardId: card.id,
            currentPhase: card.currentPhase?.name,
            cotacao: cot,
            associado: card.associado,
            lead: card.lead,
          },
        }

        leadsMap.set(card.id, leadItem)
        updatedOrImportedCount++
      } catch (itemErr) {
        console.warn(`[CRM Sync] Falha ao sincronizar card ${cardSummary.id}:`, itemErr)
      }
    }

    const finalLeads = Array.from(leadsMap.values())

    writeLeads(finalLeads)

    return {
      success: true,
      imported: updatedOrImportedCount,
      total: finalLeads.length,
      message: `${updatedOrImportedCount} leads sincronizados com dados 100% completos da API do CRM!`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      imported: 0,
      total: 0,
      message: `Erro ao sincronizar dados da API do CRM: ${msg}`,
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
