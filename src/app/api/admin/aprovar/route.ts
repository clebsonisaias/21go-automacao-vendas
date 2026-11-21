import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef, updateLead } from '@/lib/db'
import { sendWhatsAppAdesaoLiberada, sendWhatsAppVistoriaAprovada } from '@/lib/citchat'
import { absolute, pagamentoPath } from '@/lib/links'
import { esc, sendTelegramNotification } from '@/lib/telegram'
import { mpEnabled } from '@/lib/mercadopago'

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

  if (lead.status !== 'vistoria_enviada') {
    return NextResponse.json(
      { success: false, error: 'Só é possível aprovar cadastros com vistoria enviada.' },
      { status: 409 }
    )
  }
  // Adesão por último: vistoria aprovada → libera o Pix e manda o link ao cliente.
  if (mpEnabled() && !lead.pagamento?.paidAt) {
    const liberado = updateLead(lead.ref, (l) => {
      l.status = 'aguardando_pagamento'
    })
    await sendTelegramNotification(
      `✅ <b>Vistoria aprovada</b> — ${esc(lead.nome)} (${esc(lead.placa || 'sem placa')}). Pix da adesão liberado e enviado ao cliente.`
    )
    const waPix = await sendWhatsAppAdesaoLiberada({
      telefone: lead.whatsapp,
      nome: lead.nome,
      placa: lead.placa || 'do veículo',
      pagamentoUrl: absolute(pagamentoPath(lead.ref)),
      valor: lead.ativacao,
    })
    return NextResponse.json({
      success: true,
      lead: liberado,
      whatsappEnviado: waPix.success,
      message: waPix.success
        ? 'Vistoria aprovada. Link do Pix da adesão enviado no WhatsApp.'
        : 'Vistoria aprovada. WhatsApp não enviado: mande ao cliente o link do Pix.',
    })
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
