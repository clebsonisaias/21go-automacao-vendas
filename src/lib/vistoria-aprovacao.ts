import { StoredLead, updateLead } from './db'
import { sendWhatsAppAdesaoLiberada, sendWhatsAppVistoriaAprovada } from './citchat'
import { absolute, pagamentoPath } from './links'
import { esc, sendTelegramNotification } from './telegram'
import { mpEnabled } from './mercadopago'
import { sendEmail } from './email'

// Vistoria aprovada (no CRM 21Go ou no /admin). Com Pix online e adesão não paga, libera o Pix da adesão,
// que é o último passo: a tela do cliente mostra o botão e o link vai no WhatsApp. Sem Pix online,
// o cadastro vai direto para aprovado. Roda uma vez só por cadastro (troca de status condicional).

export type OrigemAprovacao = 'crm' | 'admin'

export async function aprovarVistoria(
  lead: StoredLead,
  origem: OrigemAprovacao
): Promise<{ ok: boolean; lead?: StoredLead; whatsappEnviado?: boolean; message: string }> {
  // Adesão zerada por cupom (100%): não existe Pix de R$ 0; vale como paga na aprovação.
  const adesaoGratis = lead.ativacao <= 0 && Boolean(lead.cupom)
  const liberarPix = mpEnabled() && !lead.pagamento?.paidAt && !adesaoGratis
  let mudou = false
  const updated = updateLead(lead.ref, (l) => {
    if (l.status !== 'vistoria_enviada') return
    l.status = liberarPix ? 'aguardando_pagamento' : 'aprovado'
    if (adesaoGratis && !l.pagamento) {
      const agora = new Date().toISOString()
      l.pagamento = { provider: 'cupom', orderId: '', status: 'approved', valor: 0, createdAt: agora, paidAt: agora, attempt: 0 }
    }
    mudou = true
  })
  if (!mudou || !updated) return { ok: false, message: 'Só é possível aprovar cadastros com vistoria enviada.' }

  const quem = origem === 'crm' ? 'no CRM 21Go' : 'no /admin'
  if (liberarPix) {
    await sendTelegramNotification(
      `✅ <b>Vistoria aprovada ${quem}</b> — ${esc(lead.nome)} (${esc(lead.placa || 'sem placa')}). Pix da adesão liberado: aparece na tela do cliente e vai no WhatsApp.`
    )
    await sendEmail({
      para: lead.email,
      nome: lead.nome,
      assunto: 'Vistoria aprovada: falta só a adesão',
      titulo: 'Sua vistoria foi aprovada!',
      paragrafos: [
        `Falta só o último passo: a taxa de adesão de R$ ${lead.ativacao.toFixed(2).replace('.', ',')} por Pix.`,
        'Abra o link, copie o código ou leia o QR Code. A confirmação é automática. Depois do pagamento, a 21Go envia os seus dados de acesso.',
      ],
      botao: { texto: 'Pagar a adesão via Pix', url: absolute(pagamentoPath(lead.ref)) },
    })
    const wa = await sendWhatsAppAdesaoLiberada({
      telefone: lead.whatsapp,
      nome: lead.nome,
      placa: lead.placa || 'do veículo',
      pagamentoUrl: absolute(pagamentoPath(lead.ref)),
      valor: lead.ativacao,
    })
    return {
      ok: true,
      lead: updated,
      whatsappEnviado: wa.success,
      message: wa.success
        ? 'Vistoria aprovada. Link do Pix da adesão enviado no WhatsApp e mostrado no site.'
        : 'Vistoria aprovada. O Pix aparece no site do cliente; o WhatsApp não foi enviado.',
    }
  }

  await sendTelegramNotification(
    `✅ <b>Vistoria aprovada ${quem}</b> — ${esc(lead.nome)} (${esc(lead.placa || 'sem placa')}).${
      adesaoGratis ? ` Adesão grátis (cupom ${esc(lead.cupom?.codigo)}): sem Pix.` : ''
    } Próximo passo: cadastrar no Hinova SGA para gerar as mensalidades.`
  )
  await sendEmail({
    para: lead.email,
    nome: lead.nome,
    assunto: 'Vistoria aprovada',
    titulo: 'Sua vistoria foi aprovada!',
    paragrafos: ['Estamos concluindo a sua associação. A 21Go envia os seus dados de acesso e as mensalidades.'],
  })
  const wa = await sendWhatsAppVistoriaAprovada({
    telefone: lead.whatsapp,
    nome: lead.nome,
    placa: lead.placa || 'do veículo',
  })
  return { ok: true, lead: updated, whatsappEnviado: wa.success, message: 'Vistoria aprovada.' }
}
