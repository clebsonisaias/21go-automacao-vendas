import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef } from '@/lib/db'
import { pagamentoPath } from '@/lib/links'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET ?ref= → em que passo o cliente está, para a tela do site se atualizar sozinha.
 * A ref (UUID) é a credencial; não devolve dado pessoal, só links e situação.
 */
export async function GET(req: NextRequest) {
  if (!rateLimit(req, 'vistoria-situacao', 120, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas consultas.' }, { status: 429 })
  }
  const ref = (req.nextUrl.searchParams.get('ref') || '').slice(0, 80)
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const pago = Boolean(lead.pagamento?.paidAt)
  const pixLiberado = !pago && (lead.status === 'aguardando_pagamento' || Boolean(lead.pagamento))

  return NextResponse.json(
    {
      documentos: Boolean(lead.vistoriaData),
      appVistoUrl: lead.appVistoUrl || null,
      vistoriaStatus: lead.crmVistoria?.vistoriaStatus || null,
      pagamentoUrl: pixLiberado ? pagamentoPath(lead.ref) : null,
      pago,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
