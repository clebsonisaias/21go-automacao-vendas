import { NextRequest, NextResponse, after } from 'next/server'
import { findLeadByOrderId } from '@/lib/db'
import { getOrder, verifyWebhookSignature } from '@/lib/mercadopago'
import { syncPaymentFromOrder } from '@/lib/orchestrator'

export const dynamic = 'force-dynamic'

/**
 * Webhook do Mercado Pago (tópico "Order"). Cadastre em
 * Suas integrações → Webhooks:  https://SEU-DOMINIO/api/webhooks/mercadopago
 *
 * 1) valida x-signature (HMAC-SHA256) ANTES de qualquer coisa;
 * 2) responde 200 imediatamente;
 * 3) depois consulta GET /v1/orders/{id} (nunca confia só no corpo) e atualiza o cadastro.
 * Idempotente: o mesmo aviso pode chegar várias vezes.
 */
export async function POST(req: NextRequest) {
  if (!process.env.MP_WEBHOOK_SECRET) {
    console.error('[Webhook MP] MP_WEBHOOK_SECRET não configurada.')
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') || (typeof body?.data?.id === 'string' ? body.data.id : null)

  const valid = verifyWebhookSignature({
    signatureHeader: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId,
  })
  if (!valid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const type = String(body?.type || url.searchParams.get('type') || '')
  if (type !== 'order' || !dataId) {
    return NextResponse.json({ ok: true }) // tópicos que não usamos
  }

  after(async () => {
    try {
      const order = await getOrder(dataId)
      if (!order) return
      const lead = findLeadByOrderId(order.id)
      if (!lead) {
        console.warn('[Webhook MP] Order sem cadastro correspondente:', order.id)
        return
      }
      await syncPaymentFromOrder(lead.ref, order)
    } catch (err) {
      console.error('[Webhook MP] erro ao processar:', err instanceof Error ? err.message : err)
    }
  })

  return NextResponse.json({ ok: true })
}
