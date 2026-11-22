import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef, updateLead } from '@/lib/db'
import { liberarCupom } from '@/lib/cupons'

export const dynamic = 'force-dynamic'

/**
 * Encerra um cadastro (teste, desistência, duplicado): status "cancelado".
 * Para toda a automação dele (link da vistoria, acompanhamento no CRM, Pix) e o link do
 * cliente deixa de aceitar documentos e pagamento. Não apaga nada: o histórico continua no painel.
 */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ success: false, error: 'Cadastro não encontrado.' }, { status: 404 })
  // Adesão grátis por cupom não teve dinheiro: dá para encerrar (teste, duplicado).
  if (lead.pagamento?.paidAt && lead.pagamento.provider !== 'cupom') {
    return NextResponse.json(
      { success: false, error: 'Este cadastro já pagou a adesão. Encerre pelo CRM ou Hinova, com o estorno se for o caso.' },
      { status: 409 }
    )
  }

  let encerrou = false
  const updated = updateLead(lead.ref, (l) => {
    if (l.status !== 'cancelado') encerrou = true
    l.status = 'cancelado'
  })
  // O uso do cupom volta: quem refizer o cadastro (ou um cupom de uma vez só) pode usar de novo.
  if (encerrou && updated?.cupom) liberarCupom(updated.cupom.codigo, updated.ref)
  return NextResponse.json({ success: true, lead: updated, message: 'Cadastro encerrado. A automação dele parou.' })
}
