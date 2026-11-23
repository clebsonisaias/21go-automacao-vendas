import crypto from 'node:crypto'
import { PlanPricing, PlanoNordeste, VehicleInfo } from './types'

// Token assinado devolvido pela cotação. O navegador o reenvia no cadastro, e o servidor
// usa os valores que ELE mesmo calculou (taxa de adesão, mensalidades). Sem isso, qualquer
// pessoa poderia editar o JSON e pagar R$ 0,01 de adesão pelo Pix.

const TTL_MS = 2 * 60 * 60 * 1000

interface QuotePlanSnapshot {
  /** monthly, mensalidadeComPontualidade, mensalidadeComAdesivo, ativacao */
  m: number
  p: number
  a: number
  ad: number
  n: string
  /** Plano com o preço da Tabela Nordeste: faixa e valores do CRM (para voltar a eles). */
  ne?: PlanoNordeste
}

type PowercrmMeta = { brandId: number | string; modelId: number | string; yearId: number | string }

interface QuoteTokenPayload {
  exp: number
  fipe: string
  plans: Record<string, QuotePlanSnapshot>
  /** Dados oficiais do veículo, como devolvidos pelo motor de preço (Power CRM / FIPE). */
  veh?: VehicleInfo
  /** IDs do Power CRM (marca/modelo/ano), usados no envio do lead. */
  meta?: PowercrmMeta
  /** Estado que o cliente informou na cotação. */
  uf?: string
}

// Reserva: se nenhuma variável foi definida, usa um segredo aleatório gerado na subida do servidor.
// Assim o site não para de aceitar cadastros; só as cotações abertas antes de um restart expiram.
const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex')
let warned = false

function secret(): string {
  const s = process.env.QUOTE_SIGNING_SECRET || process.env.SESSION_SECRET || ''
  if (s) return s
  if (!warned && process.env.NODE_ENV === 'production') {
    warned = true
    console.warn('[quote-token] QUOTE_SIGNING_SECRET não definida: usando segredo temporário (defina no Coolify).')
  }
  return EPHEMERAL_SECRET
}

function sign(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('base64url')
}

export function createQuoteToken(vehicle: VehicleInfo, plans: PlanPricing[], meta?: PowercrmMeta, uf?: string): string | null {
  const key = secret()
  const payload: QuoteTokenPayload = {
    exp: Date.now() + TTL_MS,
    fipe: vehicle.fipeCode,
    veh: {
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      ano: vehicle.ano,
      fipeValue: vehicle.fipeValue,
      fipeCode: vehicle.fipeCode,
      categoria: vehicle.categoria,
      combustivel: vehicle.combustivel,
    },
    meta,
    ...(uf ? { uf } : {}),
    plans: Object.fromEntries(
      plans.map((p) => [
        p.id,
        {
          m: p.monthly,
          p: p.mensalidadeComPontualidade,
          a: p.mensalidadeComAdesivo,
          ad: p.ativacao,
          n: p.name,
          ...(p.nordeste ? { ne: p.nordeste } : {}),
        },
      ])
    ),
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body, key)}`
}

export interface VerifiedQuote {
  fipe: string
  vehicle?: VehicleInfo
  meta?: PowercrmMeta
  uf?: string
  plan: {
    id: string
    name: string
    monthly: number
    pontualidade: number
    adesivo: number
    ativacao: number
    nordeste?: PlanoNordeste
  }
}

/** Valida assinatura e validade; devolve o plano escolhido com os valores do servidor. */
export function verifyQuoteToken(token: unknown, planId: string): VerifiedQuote | null {
  const key = secret()
  if (typeof token !== 'string') return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body, key)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as QuoteTokenPayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    const plan = payload.plans[planId]
    if (!plan) return null
    return {
      fipe: payload.fipe,
      vehicle: payload.veh,
      meta: payload.meta,
      uf: payload.uf,
      plan: {
        id: planId,
        name: plan.n,
        monthly: plan.m,
        pontualidade: plan.p,
        adesivo: plan.a,
        ativacao: plan.ad,
        ...(plan.ne ? { nordeste: plan.ne } : {}),
      },
    }
  } catch {
    return null
  }
}
