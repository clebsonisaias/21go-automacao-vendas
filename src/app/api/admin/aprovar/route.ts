import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef, updateLead } from '@/lib/db'
import { sendWhatsAppVistoriaAprovada } from '@/lib/citchat'
import { esc, sendTelegramNotification } from '@/lib/telegram'
import { mpEnabled } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

/**
 * Aprova a vistoria de um cadastro (ação humana, no painel). Só vale para quem já pagou a adesão
 * (quando há cobrança online) e já enviou a vistoria. Avisa o cliente por WhatsApp.
 * O envio ao Hinova SGA / geração das mensalidades continua sendo feito pela equipe.
 */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ success: false, error: 'Cadastro não encontrado.' }, { status: 404 })

  if (lead.status !== 'vistoria_enviada') {
    return NextResponse.json(
      { success: false, error: 'Só é possível aprovar cadastros com vistoria enviada.' },
      { status: 409 }
    )
  }
  if ((lead.pagamento || mpEnabled()) && !lead.pagamento?.paidAt) {
    return NextResponse.json({ success: false, error: 'A adesão ainda não foi paga.' }, { status: 409 })
  }

  const updated = updateLead(lead.ref, (l) => {
    l.status = 'aprovado'
  })

  await sendTelegramNotification(
    `✅ <b>Vistoria aprovada</b> — ${esc(lead.nome)} (${esc(lead.placa || 'sem placa')}). Próximo passo: cadastrar no Hinova SGA para gerar as mensalidades.`
  )
  const wa = await sendWhatsAppVistoriaAprovada({
    telefone: lead.whatsapp,
    nome: lead.nome,
    placa: lead.placa || 'do veículo',
  })

  return NextResponse.json({ success: true, lead: updated, whatsappEnviado: wa.success })
}
