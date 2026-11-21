import { StoredLead, getLeadsAwaitingPayment, updateLead } from './db'
import { MpOrder, applyOrderToPagamento, getOrder, isOrderPaid, orderAmountMatches } from './mercadopago'
import { sendTelegramNotification, esc } from './telegram'
import { sendWhatsAppAdesaoConfirmada } from './citchat'
import { absolute, vistoriaPath } from './links'

// Orquestra o funil após a cotação:
//   cadastro → Pix da adesão (Mercado Pago) → [pago] → link da vistoria por WhatsApp
//   → vistoria enviada → aprovação (manual, no painel/CRM) → mensalidades (Hinova SGA)
//
// Esta camada só cuida da parte que roda com APIs oficiais/contratadas. Etapas que dependem de
// endpoints internos do CRM da franqueadora (gerar vistoria no CRM, "enviar ao SGA") continuam
// manuais: o Telegram avisa e o painel /admin mostra o próximo passo.

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/**
 * Sincroniza o lead com o estado atual da order no Mercado Pago.
 * Idempotente: webhook, polling da página e conferência periódica podem chamar à vontade;
 * os avisos de "adesão paga" saem uma única vez.
 */
export async function syncPaymentFromOrder(ref: string, order: MpOrder): Promise<StoredLead | undefined> {
  let justPaid = false

  const lead = updateLead(ref, (l) => {
    if (!l.pagamento || l.pagamento.orderId !== order.id) return
    l.pagamento = applyOrderToPagamento(l.pagamento, order)

    if (!isOrderPaid(order) || l.pagamento.paidAt) return

    // Só considera pago se o valor da order for exatamente o que devemos cobrar.
    if (!orderAmountMatches(order, l)) {
      console.error('[Pagamento] Valor divergente — não ativando. lead', l.id, 'order', order.id, order.total_amount)
      return
    }

    l.pagamento.paidAt = new Date().toISOString()
    if (l.status === 'aguardando_pagamento') l.status = 'adesao_paga'
    justPaid = true
  })

  if (lead && justPaid) {
    await onAdesaoPaga(lead)
  }
  return lead
}

async function onAdesaoPaga(lead: StoredLead): Promise<void> {
  const vistoriaFeita = Boolean(lead.vistoriaData)
  const vistoriaUrl = absolute(vistoriaPath(lead))

  await sendTelegramNotification(`💰 <b>ADESÃO PAGA (Pix)!</b> 💰

👤 <b>Cliente:</b> ${esc(lead.nome)}
📱 <b>WhatsApp:</b> ${esc(lead.whatsapp)}
🚗 <b>Veículo:</b> ${esc(lead.vehicle.marca)} ${esc(lead.vehicle.modelo)} (${esc(lead.vehicle.ano)})
🔢 <b>Placa:</b> ${esc(lead.placa || 'Não informada')}
🛡️ <b>Plano:</b> ${esc(lead.planoEscolhidoNome)}
💵 <b>Adesão recebida:</b> ${brl(lead.pagamento?.valor ?? lead.ativacao)}
🧾 <b>Order MP:</b> <code>${esc(lead.pagamento?.orderId)}</code>

${vistoriaFeita ? '✅ Vistoria já enviada: cadastro completo. Confira os arquivos e aprove no painel /admin.' : '➡️ A vistoria ainda não foi enviada.'}`)

  const sent = await sendWhatsAppAdesaoConfirmada({
    telefone: lead.whatsapp,
    nome: lead.nome,
    vistoriaUrl: vistoriaFeita ? undefined : vistoriaUrl,
    valor: lead.pagamento?.valor ?? lead.ativacao,
  })
  if (!sent.success) {
    console.warn('[Pagamento] WhatsApp de confirmação não enviado:', sent.error)
    await sendTelegramNotification(
      `⚠️ Não consegui avisar ${esc(lead.nome)} (${esc(lead.whatsapp)}) no WhatsApp sobre o pagamento confirmado.`
    )
  }
}

/** Consulta o Mercado Pago e atualiza o lead (usado pelo polling da página e pelo reconciliador). */
export async function refreshLeadPayment(lead: StoredLead): Promise<StoredLead> {
  if (!lead.pagamento?.orderId) return lead
  const order = await getOrder(lead.pagamento.orderId)
  if (!order) return lead
  return (await syncPaymentFromOrder(lead.ref, order)) || lead
}

/** Rede de segurança: confere Pix pendentes mesmo que o cliente tenha fechado a página e o webhook falhe. */
export async function reconcilePendingPayments(): Promise<number> {
  const pending = getLeadsAwaitingPayment()
  let paid = 0
  for (const lead of pending) {
    // Ignora cobranças muito antigas (>3 dias): o Pix já expirou há muito.
    if (Date.now() - new Date(lead.pagamento!.createdAt).getTime() > 3 * 24 * 3600 * 1000) continue
    const after = await refreshLeadPayment(lead)
    if (after.pagamento?.paidAt) paid++
  }
  return paid
}
