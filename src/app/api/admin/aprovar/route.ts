import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef } from '@/lib/db'
import { aprovarVistoria } from '@/lib/vistoria-aprovacao'

export const dynamic = 'force-dynamic'

/**
 * Aprova a vistoria de um cadastro (ação humana, no painel). Com Pix online e adesão ainda não
 * paga, aprovar libera o Pix (último passo) e manda o link ao cliente; o pagamento conclui o cadastro.
 * O envio ao Hinova SGA / geração das mensalidades continua sendo feito pela equipe.
 */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ success: false, error: 'Cadastro não encontrado.' }, { status: 404 })

  const r = await aprovarVistoria(lead, 'admin')
  if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 409 })
  return NextResponse.json({ success: true, lead: r.lead, whatsappEnviado: r.whatsappEnviado, message: r.message })
}
