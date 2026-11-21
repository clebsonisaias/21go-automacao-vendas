import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef } from '@/lib/db'
import { refreshLeadPayment } from '@/lib/orchestrator'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Evita martelar o Mercado Pago: no máx. 1 consulta a cada 3 s por cadastro.
const lastCheck = new Map<string, number>()

/** GET ?ref= → { status: 'pending' | 'paid' | 'none', vistoriaUrl? } (usado pelo polling da página /pagamento) */
export async function GET(req: NextRequest) {
  if (!rateLimit(req, 'pix-status', 90, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas consultas.' }, { status: 429 })
  }
  const ref = (new URL(req.url).searchParams.get('ref') || '').slice(0, 80)
  let lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })

  if (lead.pagamento?.paidAt) {
    return NextResponse.json({ status: 'paid' })
  }
  if (!lead.pagamento) {
    // Cadastro antigo (sem cobrança no site): quem não está aguardando pagamento segue direto.
    return NextResponse.json({ status: 'none' })
  }

  const now = Date.now()
  if (now - (lastCheck.get(ref) || 0) > 3000) {
    lastCheck.set(ref, now)
    if (lastCheck.size > 2000) lastCheck.clear()
    lead = await refreshLeadPayment(lead)
  }

  if (lead.pagamento?.paidAt) {
    return NextResponse.json({ status: 'paid' })
  }
  const dead = ['canceled', 'cancelled', 'expired', 'failed'].includes(lead.pagamento?.status || '')
  return NextResponse.json({ status: dead ? 'expired' : 'pending' })
}
