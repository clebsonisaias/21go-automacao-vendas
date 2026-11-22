import { LeadPagamento, StoredLead, updateLead } from './db'
import { createPixOrder, getOrder, isOrderDead, mpEnabled } from './mercadopago'
import { refreshLeadPayment, syncPaymentFromOrder } from './orchestrator'

/**
 * Pix da taxa de adesão de um cadastro: devolve o que está valendo ou gera um novo.
 * Usado pela página /pagamento (`/api/pagamento/pix`) e pelo chat (`/api/atendai/v1/pagamento`),
 * para os dois cobrarem igual. O valor é sempre `lead.ativacao`, fixado pelo servidor.
 */
export type PixDaAdesao =
  | { status: 'indisponivel' } // Pix do site desligado
  | { status: 'cancelado' }
  | { status: 'pago' }
  | { status: 'gratis' } // adesão zerada por cupom
  | { status: 'bloqueado' } // vistoria ainda não aprovada (adesão por último)
  | { status: 'limite' } // cobranças demais geradas para este cadastro
  | { status: 'valor_mudou' } // a adesão mudou enquanto a ordem era criada
  | { status: 'pendente'; pagamento: LeadPagamento }

const MAX_TENTATIVAS = 5

export async function obterPixDaAdesao(inicial: StoredLead): Promise<PixDaAdesao> {
  if (!mpEnabled()) return { status: 'indisponivel' }
  let lead = inicial
  if (lead.status === 'cancelado') return { status: 'cancelado' }

  if (lead.pagamento?.paidAt) return { status: lead.pagamento.provider === 'cupom' ? 'gratis' : 'pago' }
  // Adesão zerada por cupom: não existe Pix de R$ 0 (vale como paga quando a vistoria é aprovada).
  if (lead.ativacao <= 0) return { status: 'gratis' }
  // Adesão por último: o Pix só abre depois de a equipe aprovar a vistoria (status aguardando_pagamento).
  if (lead.status !== 'aguardando_pagamento' && !lead.pagamento) return { status: 'bloqueado' }

  // Pix já emitido e ainda válido: confere no MP e reaproveita (não gera cobrança duplicada).
  if (lead.pagamento) {
    lead = await refreshLeadPayment(lead)
    if (lead.pagamento?.paidAt) return { status: 'pago' }
    const atual = lead.pagamento && (await getOrder(lead.pagamento.orderId))
    if (atual && !isOrderDead(atual) && lead.pagamento?.qrCode) return { status: 'pendente', pagamento: lead.pagamento }
  }

  // Sem Pix, ou o anterior expirou/cancelou: gera um novo.
  const tentativa = (lead.pagamento?.attempt ?? 0) + 1
  if (tentativa > MAX_TENTATIVAS) return { status: 'limite' }
  const pagamento = await createPixOrder(lead, tentativa)
  // A ordem foi criada com o valor lido acima; se a adesão mudou nesse meio-tempo, não grava
  // (o cliente pagaria um valor que a conferência do pagamento recusaria). A ordem fica sem uso e vence.
  const valorDaOrdem = lead.ativacao
  let valorMudou = false
  const gravado = updateLead(lead.ref, (l) => {
    if (l.ativacao !== valorDaOrdem) {
      valorMudou = true
      return
    }
    l.pagamento = pagamento
  })
  if (valorMudou) {
    console.warn('[pix-adesao] adesão mudou durante a criação do Pix; ordem descartada', { orderId: pagamento.orderId })
    return { status: 'valor_mudou' }
  }
  if (!gravado?.pagamento) throw new Error('Falha ao salvar cobrança')

  // Caso raro: o MP já devolve a order paga/processada.
  const fresca = await getOrder(pagamento.orderId)
  if (fresca) await syncPaymentFromOrder(lead.ref, fresca)

  return { status: 'pendente', pagamento: gravado.pagamento }
}
