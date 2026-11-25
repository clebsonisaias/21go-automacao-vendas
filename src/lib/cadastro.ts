import { sendLeadToPowerCrm } from '@/lib/powercrm-lead'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendWhatsAppQuoteMessage } from '@/lib/citchat'
import { findLeadByRef, saveNewLead, StoredLead } from '@/lib/db'
import { verifyQuoteToken } from '@/lib/quote-token'
import { mpEnabled } from '@/lib/mercadopago'
import { vistoriaPath } from '@/lib/links'
import { LeadSubmissionPayload } from '@/lib/types'
import { calcularDesconto, conferirCupom, liberarCupom, normalizarCodigo, reservarCupom } from '@/lib/cupons'
import { linhaTabelaNordeste } from '@/lib/tabela-nordeste'
import { descreverOrigem, limparOrigem } from '@/lib/origem'

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
  // Cupom só entra por `aplicarCupom`, nunca pelo que veio no pedido.
  delete payload.cupom
  delete payload.ativacaoOriginal
  if (verified.vehicle) {
    payload.vehicle = { ...verified.vehicle, placa: payload.vehicle.placa }
  }
  if (verified.meta) payload.powercrmMeta = verified.meta
  payload.planoEscolhidoNome = verified.plan.name
  payload.mensalidadeOriginal = verified.plan.monthly
  // Origem vem do navegador: só os campos conhecidos, limpos, com o canal recalculado.
  const origem = limparOrigem(payload.origem)
  if (origem) payload.origem = origem
  else delete payload.origem

  // Região e preço regional só vêm do token, nunca do pedido.
  delete payload.ufDeclarada
  delete payload.tabelaNordeste
  delete payload.planoBaseId
  payload.estado = verified.uf
  if (verified.uf) payload.ufDeclarada = verified.uf
  if (verified.base) payload.planoBaseId = verified.base
  const ne = verified.plan.regional
  if (ne) {
    payload.precoRegiao = 'regional'
    payload.tabelaNordeste = ne.tabela
    payload.planoNacional = ne.nacional
    // A tabela é o valor normal; pagamento em dia e adesivo entram por cima. "Com adesivo" só
    // quando o valor escolhido é o do adesivo (e ele é de fato menor que o de pagamento em dia).
    const p = verified.plan
    payload.comAdesivo = p.adesivo < p.pontualidade && Math.abs(payload.mensalidadeFinal - p.adesivo) < 0.005
  } else {
    const p = verified.plan
    payload.precoRegiao = 'nacional'
    payload.planoNacional = { monthly: p.monthly, pontualidade: p.pontualidade, adesivo: p.adesivo, ativacao: p.ativacao }
  }
  return null
}

/** O cupom foi recusado na hora de gravar (ex.: o último uso acabou de ser pego por outro). */
export class CupomRecusado extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'CupomRecusado'
  }
}

/**
 * Aplica o cupom de desconto na adesão, depois de `aplicarCotacao` (que fixa a adesão
 * assinada). Só confere: o uso é reservado em `registrarCadastro`. Devolve o motivo da
 * recusa (texto para o cliente) ou `null`. Sem código, não faz nada.
 */
export function aplicarCupom(
  payload: LeadSubmissionPayload,
  codigoBruto: unknown,
  origem: 'cadastro' | 'chat'
): string | null {
  const codigo = normalizarCodigo(codigoBruto)
  if (!codigo) return null
  const r = conferirCupom(codigo)
  if (!r.ok) return r.motivo
  const { valorDesconto, ativacaoFinal } = calcularDesconto(payload.ativacao, r.cupom)
  payload.ativacaoOriginal = payload.ativacao
  payload.ativacao = ativacaoFinal
  payload.cupom = {
    codigo: r.cupom.codigo,
    tipo: r.cupom.tipo,
    desconto: r.cupom.desconto,
    valorDesconto,
    aplicadoEm: new Date().toISOString(),
    origem,
  }
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

  // Reserva o uso do cupom antes de gravar; se algo falhar depois, o uso é devolvido.
  if (payload.cupom) {
    const r = reservarCupom(payload.cupom.codigo, leadRef)
    if (!r.ok) throw new CupomRecusado(r.motivo)
  }
  try {
    return await gravarCadastro(payload, leadRef, cobrarPix, opcoes)
  } catch (err) {
    // Só devolve o uso se o cadastro não chegou a ser gravado (gravado, o cupom é dele).
    if (payload.cupom && !findLeadByRef(leadRef)) liberarCupom(payload.cupom.codigo, leadRef)
    throw err
  }
}

async function gravarCadastro(
  payload: LeadSubmissionPayload,
  leadRef: string,
  cobrarPix: boolean,
  opcoes: { enviarWhatsApp: boolean; origem: 'site' | 'chat' }
): Promise<CadastroFeito> {
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

  const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const ativacaoFormatted = payload.cupom
    ? `${brl(payload.ativacao)} (cupom ${payload.cupom.codigo}, de ${brl(payload.ativacaoOriginal ?? payload.ativacao)})`
    : brl(payload.ativacao)

  const vistoriaUrl = vistoriaPath(storedLead)

  const checkoutUrl =
    !cobrarPix && powerCrmResult.qttnCd ? `https://checkout.cotacao.me/myplanquot?h=${powerCrmResult.qttnCd}` : undefined

  const linhaRegiao = payload.tabelaNordeste
    ? `📍 <b>Preço Nordeste:</b> ${esc(linhaTabelaNordeste(payload.tabelaNordeste, payload.ufDeclarada, payload.planoNacional?.monthly))}\n`
    : payload.ufDeclarada
      ? `📍 <b>Estado informado:</b> ${esc(payload.ufDeclarada)} (preço nacional)\n`
      : ''

  const titulo = opcoes.origem === 'chat' ? '💬 <b>NOVO CADASTRO PELO CHAT!</b> 💬' : '🚨 <b>NOVO CADASTRO NO SITE!</b> 🚨'
  const telegramMessage = `${titulo}\n\n👤 <b>Cliente:</b> ${esc(payload.nome || 'Aguardando documentos')}\n📱 <b>WhatsApp:</b> ${esc(payload.whatsapp)}\n${payload.cpf ? `📄 <b>CPF:</b> ${esc(payload.cpf)}\n` : ''}✉️ <b>E-mail:</b> ${esc(payload.email)}\n${payload.cidade ? `📍 <b>Cidade:</b> ${esc(payload.cidade)}\n` : ''}🚗 <b>Veículo:</b> ${esc(payload.vehicle.marca)} ${esc(payload.vehicle.modelo)} (${esc(payload.vehicle.ano)})\n🔢 <b>Placa:</b> ${esc(payload.placa || payload.vehicle.placa || 'Não informada')}\n💰 <b>Tabela FIPE:</b> ${fipeFormatted}\n🚕 <b>Trabalho/App:</b> ${payload.veiculoTrabalho ? 'Sim' : 'Não'}\n\n🛡️ <b>Plano Escolhido:</b> ${esc(payload.planoEscolhidoNome)}\n💵 <b>Mensalidade:</b> ${mensalidadeFormatted}/mês ${payload.comAdesivo ? '(com adesivo)' : ''}\n⚡ <b>Ativação:</b> ${ativacaoFormatted}\n${linhaRegiao}\n📣 ${esc(descreverOrigem(payload.origem))}\n${powerCrmResult.qttnCd ? `📋 <b>Código PowerCRM:</b> <code>${esc(powerCrmResult.qttnCd)}</code>\n` : ''}${checkoutUrl ? `🔗 <b>Link Checkout:</b> ${esc(checkoutUrl)}\n` : ''}💾 <b>Backup Local:</b> Salvo no painel interno (ID: <code>${storedLead.id}</code>)\n✅ <b>Status:</b> Cadastrado. Aguardando documentos para completar dados.${cobrarPix ? ' Ordem: documentos → App Visto → aprovação → Pix' : ''}.`

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
