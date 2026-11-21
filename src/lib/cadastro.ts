import { sendLeadToPowerCrm } from '@/lib/powercrm-lead'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendWhatsAppQuoteMessage } from '@/lib/citchat'
import { saveNewLead, StoredLead } from '@/lib/db'
import { verifyQuoteToken } from '@/lib/quote-token'
import { mpEnabled } from '@/lib/mercadopago'
import { vistoriaPath } from '@/lib/links'
import { LeadSubmissionPayload } from '@/lib/types'

/**
 * O cadastro de um cliente, igual para o formulário do site (`/api/quote/submit`)
 * e para o chat de atendimento (`/api/atendai/v1/contratacao`): o mesmo lead no
 * PowerCRM, no painel e no Telegram, e os mesmos valores, sempre os que o
 * servidor calculou na cotação (token assinado), nunca os que vieram no pedido.
 */

const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1_000_000

/** Valida o corpo do cadastro antes de usá-lo em CRM, Telegram e WhatsApp. */
export function validarCadastro(p: any): string | null {
  if (!p || typeof p !== 'object') return 'Dados inválidos.'
  // Nome é opcional (vem do documento)
  if (p.nome && (typeof p.nome !== 'string' || !/^[\p{L}\p{M}' .-]{2,100}$/u.test(p.nome.trim()))) {
    return 'Nome inválido.'
  }
  const phone = typeof p.whatsapp === 'string' ? p.whatsapp.replace(/\D/g, '') : ''
  if (phone.length < 10 || phone.length > 13) return 'WhatsApp inválido.'
  if (!str(p.planoEscolhidoId, 40) || !p.planoEscolhidoId) return 'Plano é obrigatório.'
  if (!str(p.planoEscolhidoNome, 60)) return 'Plano inválido.'
  if (!num(p.mensalidadeFinal) || !num(p.ativacao)) return 'Valores do plano inválidos.'
  // CPF é opcional (vem do documento)
  if (p.cpf && (typeof p.cpf !== 'string' || p.cpf.replace(/\D/g, '').length !== 11)) return 'CPF inválido.'
  // E-mail é obrigatório (não vem do documento)
  if (typeof p.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) || p.email.length > 120) return 'E-mail é obrigatório e deve ser válido.'
  // Cidade é opcional (vem do comprovante)
  if (p.cidade && !str(p.cidade, 80)) return 'Cidade inválida.'
  if (p.placa != null && !str(p.placa, 10)) return 'Placa inválida.'
  const v = p.vehicle
  if (!v || typeof v !== 'object' || !str(v.marca, 80) || !str(v.modelo, 120) || !str(String(v.ano ?? ''), 10)) {
    return 'Dados do veículo inválidos.'
  }
  if (v.fipeValue != null && !num(v.fipeValue)) return 'Valor FIPE inválido.'
  if (v.fipeCode != null && !str(v.fipeCode, 20)) return 'Código FIPE inválido.'
  return null
}

/**
 * Confere a cotação assinada e troca os valores do pedido pelos do servidor.
 * Devolve o motivo da recusa, ou `null` com o `payload` já corrigido.
 */
export function aplicarCotacao(payload: LeadSubmissionPayload): string | null {
  const verified = verifyQuoteToken(payload.quoteToken, payload.planoEscolhidoId)
  if (!verified || verified.fipe !== payload.vehicle.fipeCode) {
    return 'Sua cotação expirou. Refaça a simulação para continuar.'
  }
  const allowedMensal = [verified.plan.monthly, verified.plan.pontualidade, verified.plan.adesivo]
  if (!allowedMensal.some((v) => Math.abs(v - payload.mensalidadeFinal) < 0.005)) {
    return 'Valores do plano inválidos. Refaça a simulação.'
  }
  payload.ativacao = verified.plan.ativacao
  if (verified.vehicle) {
    payload.vehicle = { ...verified.vehicle, placa: payload.vehicle.placa }
  }
  if (verified.meta) payload.powercrmMeta = verified.meta
  payload.planoEscolhidoNome = verified.plan.name
  payload.mensalidadeOriginal = verified.plan.monthly
  return null
}

export interface CadastroFeito {
  lead: StoredLead
  powerCrmSuccess: boolean
  powerCrmQuotationCode?: string
  checkoutUrl?: string
  vistoriaUrl: string
}

/**
 * Cria o cadastro (PowerCRM, painel, Telegram) com o `payload` já validado e
 * com a cotação aplicada. `enviarWhatsApp` = a mensagem dos documentos; o chat
 * não manda, porque a própria conversa entrega o link.
 */
export async function registrarCadastro(
  payload: LeadSubmissionPayload,
  opcoes: { enviarWhatsApp: boolean; origem: 'site' | 'chat' }
): Promise<CadastroFeito> {
  const cobrarPix = mpEnabled()
  const leadRef = `lead_${crypto.randomUUID()}`

  const powerCrmResult = await sendLeadToPowerCrm(payload)
  // O card do CRM 21Go chega pela sincronização do PowerCRM; o site não cria outro (ficava duplicado no Kanban).

  const storedLead = saveNewLead(payload, leadRef, powerCrmResult.qttnCd, 'pendente_vistoria')

  const fipeFormatted = payload.vehicle.fipeValue
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.vehicle.fipeValue)
    : 'Sob consulta'

  const mensalidadeFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(payload.mensalidadeFinal)

  const ativacaoFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(payload.ativacao)

  const vistoriaUrl = vistoriaPath(storedLead)

  const checkoutUrl =
    !cobrarPix && powerCrmResult.qttnCd ? `https://checkout.cotacao.me/myplanquot?h=${powerCrmResult.qttnCd}` : undefined

  const titulo = opcoes.origem === 'chat' ? '💬 <b>NOVO CADASTRO PELO CHAT!</b> 💬' : '🚨 <b>NOVO CADASTRO NO SITE!</b> 🚨'
  const telegramMessage = `${titulo}\n\n👤 <b>Cliente:</b> ${esc(payload.nome || 'Aguardando documentos')}\n📱 <b>WhatsApp:</b> ${esc(payload.whatsapp)}\n${payload.cpf ? `📄 <b>CPF:</b> ${esc(payload.cpf)}\n` : ''}✉️ <b>E-mail:</b> ${esc(payload.email)}\n${payload.cidade ? `📍 <b>Cidade:</b> ${esc(payload.cidade)}\n` : ''}🚗 <b>Veículo:</b> ${esc(payload.vehicle.marca)} ${esc(payload.vehicle.modelo)} (${esc(payload.vehicle.ano)})\n🔢 <b>Placa:</b> ${esc(payload.placa || payload.vehicle.placa || 'Não informada')}\n💰 <b>Tabela FIPE:</b> ${fipeFormatted}\n🚕 <b>Trabalho/App:</b> ${payload.veiculoTrabalho ? 'Sim' : 'Não'}\n\n🛡️ <b>Plano Escolhido:</b> ${esc(payload.planoEscolhidoNome)}\n💵 <b>Mensalidade:</b> ${mensalidadeFormatted}/mês ${payload.comAdesivo ? '(com adesivo)' : ''}\n⚡ <b>Ativação:</b> ${ativacaoFormatted}\n\n${powerCrmResult.qttnCd ? `📋 <b>Código PowerCRM:</b> <code>${esc(powerCrmResult.qttnCd)}</code>\n` : ''}${checkoutUrl ? `🔗 <b>Link Checkout:</b> ${esc(checkoutUrl)}\n` : ''}💾 <b>Backup Local:</b> Salvo no painel interno (ID: <code>${storedLead.id}</code>)\n✅ <b>Status:</b> Cadastrado. Aguardando documentos para completar dados.${cobrarPix ? ' Ordem: documentos → App Visto → aprovação → Pix' : ''}.`

  await sendTelegramNotification(telegramMessage)

  if (opcoes.enviarWhatsApp) {
    await sendWhatsAppQuoteMessage(payload, {
      quotationCode: cobrarPix ? undefined : powerCrmResult.qttnCd,
      vistoriaUrl,
    })
  }

  return {
    lead: storedLead,
    powerCrmSuccess: powerCrmResult.success,
    powerCrmQuotationCode: powerCrmResult.qttnCd,
    checkoutUrl,
    vistoriaUrl,
  }
}
