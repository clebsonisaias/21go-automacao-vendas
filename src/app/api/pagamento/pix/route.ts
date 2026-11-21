import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef, updateLead } from '@/lib/db'
import { createPixOrder, getOrder, isOrderDead, mpEnabled } from '@/lib/mercadopago'
import { refreshLeadPayment, syncPaymentFromOrder } from '@/lib/orchestrator'
import { vistoriaPath } from '@/lib/links'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST { ref } → devolve (ou gera) o Pix da taxa de adesão do cadastro.
 * A ref (UUID imprevisível) funciona como credencial. O valor cobrado é o do cadastro,
 * fixado pelo servidor a partir do token de cotação assinado — o navegador não envia valor.
 */
export async function POST(req: NextRequest) {
  try {
    if (!mpEnabled()) {
      return NextResponse.json({ error: 'Pagamento online indisponível no momento.' }, { status: 503 })
    }
    if (!rateLimit(req, 'pix-create', 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
    let lead = ref ? findLeadByRef(ref) : undefined
    if (!lead) {
      return NextResponse.json({ error: 'Link inválido ou expirado. Faça uma nova cotação.' }, { status: 404 })
    }

    // Já pago: segue para a vistoria.
    if (lead.pagamento?.paidAt || (lead.status !== 'aguardando_pagamento' && !lead.pagamento)) {
      return NextResponse.json({ status: 'paid', vistoriaUrl: vistoriaPath(lead) })
    }

    // Pix já emitido e ainda válido: confere no MP e reaproveita (não gera cobrança duplicada).
    if (lead.pagamento) {
      lead = await refreshLeadPayment(lead)
      if (lead.pagamento?.paidAt) {
        return NextResponse.json({ status: 'paid', vistoriaUrl: vistoriaPath(lead) })
      }
      const current = lead.pagamento && (await getOrder(lead.pagamento.orderId))
      if (current && !isOrderDead(current) && lead.pagamento?.qrCode) {
        return NextResponse.json(publicPix(lead.pagamento))
      }
    }

    // Sem Pix, ou o anterior expirou/cancelou: gera um novo.
    const attempt = (lead.pagamento?.attempt ?? 0) + 1
    if (attempt > 5) {
      return NextResponse.json({ error: 'Limite de cobranças atingido. Fale com a nossa equipe.' }, { status: 429 })
    }
    const pagamento = await createPixOrder(lead, attempt)
    const updated = updateLead(lead.ref, (l) => {
      l.pagamento = pagamento
      l.status = 'aguardando_pagamento'
    })
    if (!updated?.pagamento) throw new Error('Falha ao salvar cobrança')

    // Caso raro: o MP já devolve a order paga/processada.
    const fresh = await getOrder(pagamento.orderId)
    if (fresh) await syncPaymentFromOrder(lead.ref, fresh)

    return NextResponse.json(publicPix(updated.pagamento))
  } catch (err) {
    console.error('[/api/pagamento/pix]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível gerar o Pix agora. Tente novamente.' }, { status: 502 })
  }
}

function publicPix(p: NonNullable<ReturnType<typeof findLeadByRef>>['pagamento'] & object) {
  return {
    status: 'pending' as const,
    valor: p.valor,
    qrCode: p.qrCode,
    qrCodeBase64: p.qrCodeBase64,
    ticketUrl: p.ticketUrl,
  }
}
