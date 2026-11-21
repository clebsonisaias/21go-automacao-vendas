import crypto from 'node:crypto'
import { LeadPagamento, StoredLead } from './db'

// Mercado Pago — cobrança Pix da taxa de adesão (Orders API, Checkout API / Checkout Transparente).
// Docs: https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/websites/pix
//
// Variáveis de ambiente:
//   MP_ACCESS_TOKEN     (obrigatória) token privado da aplicação — nunca vai ao navegador
//   MP_WEBHOOK_SECRET   (obrigatória p/ webhook) "Assinatura secreta" em Suas integrações → Webhooks
//   MP_PIX_EXPIRATION   (opcional) duração ISO-8601 do Pix, padrão PT1H (limite MP: 30 min a 30 dias)
//   MP_FALLBACK_PAYER_EMAIL (opcional) e-mail usado quando o cliente não informou um

// MP_API_BASE existe só para testes automatizados com um servidor simulado; em produção fica vazio.
const API = process.env.MP_API_BASE || 'https://api.mercadopago.com'

export function mpEnabled(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN)
}

function headers(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  }
}

interface MpOrderPayment {
  id?: string
  status?: string
  status_detail?: string
  amount?: string
  payment_method?: {
    id?: string
    type?: string
    qr_code?: string
    qr_code_base64?: string
    ticket_url?: string
  }
  expiration_time?: string
}

export interface MpOrder {
  id: string
  status: string
  status_detail?: string
  total_amount?: string
  external_reference?: string
  transactions?: { payments?: MpOrderPayment[] }
}

/** Valor em reais com 2 casas, no formato que a API exige ("50.00", nunca "50"). */
export function brl2(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2)
}

function payerEmail(lead: StoredLead): string {
  if (lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return lead.email
  return process.env.MP_FALLBACK_PAYER_EMAIL || 'pagamentos@21go.seg.br'
}

function toPagamento(order: MpOrder, valor: number, attempt: number, createdAt?: string): LeadPagamento {
  const pay = order.transactions?.payments?.[0]
  const pm = pay?.payment_method
  return {
    provider: 'mercadopago',
    orderId: order.id,
    paymentId: pay?.id,
    status: order.status,
    statusDetail: order.status_detail || pay?.status_detail,
    valor,
    qrCode: pm?.qr_code,
    qrCodeBase64: pm?.qr_code_base64,
    ticketUrl: pm?.ticket_url,
    createdAt: createdAt || new Date().toISOString(),
    attempt,
  }
}

/**
 * Cria a cobrança Pix da taxa de adesão. O VALOR vem do lead (definido pelo servidor a partir
 * do token de cotação assinado), nunca de um número enviado pelo navegador nesta chamada.
 */
export async function createPixOrder(lead: StoredLead, attempt: number): Promise<LeadPagamento> {
  const valor = brl2(lead.ativacao)
  const res = await fetch(`${API}/v1/orders`, {
    method: 'POST',
    // Chave de idempotência por lead+tentativa: repetir a chamada não gera Pix duplicado.
    headers: headers({ 'X-Idempotency-Key': `adesao-${lead.id}-${attempt}` }),
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: valor,
      external_reference: lead.id,
      transactions: {
        payments: [
          {
            amount: valor,
            payment_method: { id: 'pix', type: 'bank_transfer' },
            expiration_time: process.env.MP_PIX_EXPIRATION || 'PT1H',
          },
        ],
      },
      payer: { email: payerEmail(lead) },
    }),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.id) {
    console.error('[MercadoPago] Falha ao criar order Pix:', res.status, JSON.stringify(data).slice(0, 500))
    throw new Error('Não foi possível gerar o Pix agora.')
  }
  return toPagamento(data as MpOrder, lead.ativacao, attempt)
}

export async function getOrder(orderId: string): Promise<MpOrder | null> {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) return null
  try {
    const res = await fetch(`${API}/v1/orders/${orderId}`, {
      headers: headers(),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.warn('[MercadoPago] GET order', orderId, 'HTTP', res.status)
      return null
    }
    return (await res.json()) as MpOrder
  } catch (err) {
    console.warn('[MercadoPago] Erro ao consultar order:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Pago de verdade = order "processed" (status_detail "accredited"). */
export function isOrderPaid(order: MpOrder): boolean {
  return order.status === 'processed'
}

/** Order encerrada sem pagamento (Pix expirado/cancelado): pode-se gerar uma nova cobrança. */
export function isOrderDead(order: MpOrder): boolean {
  return ['canceled', 'cancelled', 'expired', 'failed', 'refunded'].includes(order.status)
}

/** Confere se o valor da order bate com o que devemos cobrar do lead. */
export function orderAmountMatches(order: MpOrder, lead: StoredLead): boolean {
  const total = Number(order.total_amount)
  return Number.isFinite(total) && Math.abs(total - lead.ativacao) < 0.005
}

export function applyOrderToPagamento(prev: LeadPagamento, order: MpOrder): LeadPagamento {
  const fresh = toPagamento(order, prev.valor, prev.attempt, prev.createdAt)
  return {
    ...prev,
    status: fresh.status,
    statusDetail: fresh.statusDetail,
    paymentId: fresh.paymentId || prev.paymentId,
    qrCode: fresh.qrCode || prev.qrCode,
    qrCodeBase64: fresh.qrCodeBase64 || prev.qrCodeBase64,
    ticketUrl: fresh.ticketUrl || prev.ticketUrl,
  }
}

/**
 * Valida a assinatura do webhook (x-signature).
 * Manifesto: `id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;`
 * Se data.id ou x-request-id faltarem, o segmento é omitido (regra da doc).
 */
export function verifyWebhookSignature(params: {
  signatureHeader: string | null
  requestId: string | null
  dataId: string | null
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret || !params.signatureHeader) return false

  const parts = Object.fromEntries(
    params.signatureHeader.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    })
  ) as Record<string, string>
  const { ts, v1 } = parts
  if (!ts || !v1) return false

  // Rejeita notificações muito antigas (replay): tolerância de 10 minutos.
  const tsNum = Number(ts)
  if (Number.isFinite(tsNum)) {
    const ms = tsNum > 1e12 ? tsNum : tsNum * 1000
    if (Math.abs(Date.now() - ms) > 10 * 60 * 1000) return false
  }

  let manifest = ''
  if (params.dataId) manifest += `id:${params.dataId.toLowerCase()};`
  if (params.requestId) manifest += `request-id:${params.requestId};`
  manifest += `ts:${ts};`

  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
}
