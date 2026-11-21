import { NextRequest, NextResponse } from 'next/server'
import { sendLeadToPowerCrm } from '@/lib/powercrm-lead'
import { sendLeadToCrm } from '@/lib/crm'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { rateLimit } from '@/lib/rate-limit'
import { sendWhatsAppQuoteMessage } from '@/lib/citchat'
import { saveNewLead } from '@/lib/db'
import { verifyQuoteToken } from '@/lib/quote-token'
import { mpEnabled } from '@/lib/mercadopago'
import { pagamentoPath, vistoriaPath } from '@/lib/links'
import { LeadSubmissionPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1_000_000

/** Valida o corpo vindo do navegador (endpoint público) antes de usá-lo em CRM, Telegram e WhatsApp. */
function validatePayload(p: any): string | null {
  if (!p || typeof p !== 'object') return 'Dados inválidos.'
  if (typeof p.nome !== 'string' || !/^[\p{L}\p{M}' .-]{2,100}$/u.test(p.nome.trim())) {
    return 'Informe o nome completo (apenas letras).'
  }
  const phone = typeof p.whatsapp === 'string' ? p.whatsapp.replace(/\D/g, '') : ''
  if (phone.length < 10 || phone.length > 13) return 'WhatsApp inválido.'
  if (!str(p.planoEscolhidoId, 40) || !p.planoEscolhidoId) return 'Plano é obrigatório.'
  if (!str(p.planoEscolhidoNome, 60)) return 'Plano inválido.'
  if (!num(p.mensalidadeFinal) || !num(p.ativacao)) return 'Valores do plano inválidos.'
  if (p.cpf != null && !(typeof p.cpf === 'string' && p.cpf.replace(/\D/g, '').length === 11)) return 'CPF inválido.'
  if (p.email != null && p.email !== '' && !(str(p.email, 120) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))) return 'E-mail inválido.'
  if (p.cidade != null && !str(p.cidade, 80)) return 'Cidade inválida.'
  if (p.placa != null && !str(p.placa, 10)) return 'Placa inválida.'
  const v = p.vehicle
  if (!v || typeof v !== 'object' || !str(v.marca, 80) || !str(v.modelo, 120) || !str(String(v.ano ?? ''), 10)) {
    return 'Dados do veículo inválidos.'
  }
  if (v.fipeValue != null && !num(v.fipeValue)) return 'Valor FIPE inválido.'
  if (v.fipeCode != null && !str(v.fipeCode, 20)) return 'Código FIPE inválido.'
  return null
}

export async function POST(req: NextRequest) {
  try {
    // Endpoint público que aciona CRM, Telegram e WhatsApp oficial: limita abuso por IP.
    if (!rateLimit(req, 'quote-submit', 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const payload: LeadSubmissionPayload = await req.json()

    const invalid = validatePayload(payload)
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 })
    }

    // Valores (adesão, mensalidade) vêm do token assinado pelo servidor — nunca do navegador.
    const verified = verifyQuoteToken(payload.quoteToken, payload.planoEscolhidoId)
    if (!verified || verified.fipe !== payload.vehicle.fipeCode) {
      return NextResponse.json(
        { error: 'Sua cotação expirou. Refaça a simulação para continuar.' },
        { status: 400 }
      )
    }
    const allowedMensal = [verified.plan.monthly, verified.plan.pontualidade, verified.plan.adesivo]
    if (!allowedMensal.some((v) => Math.abs(v - payload.mensalidadeFinal) < 0.005)) {
      return NextResponse.json({ error: 'Valores do plano inválidos. Refaça a simulação.' }, { status: 400 })
    }
    payload.ativacao = verified.plan.ativacao
    payload.planoEscolhidoNome = verified.plan.name
    payload.mensalidadeOriginal = verified.plan.monthly

    const cobrarPix = mpEnabled()

    // Referência imprevisível: é ela que autoriza o envio posterior da vistoria.
    const leadRef = `lead_${crypto.randomUUID()}`

    // 1. Cadastra diretamente no Power CRM com código de consultor CITmax (vrXbXyyq)
    const powerCrmResult = await sendLeadToPowerCrm(payload)

    // 2. Se configuradas as credenciais do CRM 21 Go, também notifica o CRM 21 Go
    const crmResult = await sendLeadToCrm(payload)

    // 3. Salva no nosso banco de dados de backup local
    const storedLead = saveNewLead(
      payload,
      leadRef,
      powerCrmResult.qttnCd,
      cobrarPix ? 'aguardando_pagamento' : 'pendente_vistoria'
    )

    // 4. Formatações para notificação
    const fipeFormatted = payload.vehicle.fipeValue
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          payload.vehicle.fipeValue
        )
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
    const pagamentoUrl = cobrarPix ? pagamentoPath(leadRef) : undefined

    // Com Mercado Pago ativo, a adesão é paga no nosso Pix; o checkout externo só entra sem ele.
    const checkoutUrl =
      !cobrarPix && powerCrmResult.qttnCd
        ? `https://checkout.cotacao.me/myplanquot?h=${powerCrmResult.qttnCd}`
        : undefined

    // 5. Dispara Notificação Instantânea no Telegram para você
    const telegramMessage = `🚨 <b>NOVO CADASTRO NO SITE!</b> 🚨

👤 <b>Cliente:</b> ${esc(payload.nome)}
📱 <b>WhatsApp:</b> ${esc(payload.whatsapp)}
${payload.cpf ? `📄 <b>CPF:</b> ${esc(payload.cpf)}\n` : ''}${payload.email ? `✉️ <b>E-mail:</b> ${esc(payload.email)}\n` : ''}${payload.cidade ? `📍 <b>Cidade:</b> ${esc(payload.cidade)}\n` : ''}🚗 <b>Veículo:</b> ${esc(payload.vehicle.marca)} ${esc(payload.vehicle.modelo)} (${esc(payload.vehicle.ano)})
🔢 <b>Placa:</b> ${esc(payload.placa || payload.vehicle.placa || 'Não informada')}
💰 <b>Tabela FIPE:</b> ${fipeFormatted}
🚕 <b>Trabalho/App:</b> ${payload.veiculoTrabalho ? 'Sim' : 'Não'}

🛡️ <b>Plano Escolhido:</b> ${esc(payload.planoEscolhidoNome)}
💵 <b>Mensalidade:</b> ${mensalidadeFormatted}/mês ${payload.comAdesivo ? '(com adesivo)' : ''}
⚡ <b>Ativação:</b> ${ativacaoFormatted}

${powerCrmResult.qttnCd ? `📋 <b>Código PowerCRM:</b> <code>${esc(powerCrmResult.qttnCd)}</code>\n` : ''}${checkoutUrl ? `🔗 <b>Link Checkout:</b> ${esc(checkoutUrl)}\n` : ''}💾 <b>Backup Local:</b> Salvo no painel interno (ID: <code>${storedLead.id}</code>)
✅ <b>Status:</b> ${cobrarPix ? 'Cadastrado — aguardando pagamento do Pix da adesão.' : 'Cadastrado e aguardando vistoria digital.'}`

    await sendTelegramNotification(telegramMessage)

    // 6. Dispara WhatsApp automático via AtendeHub / CITchat para o cliente (com link de checkout e vistoria)
    await sendWhatsAppQuoteMessage(payload, {
      quotationCode: powerCrmResult.qttnCd,
      vistoriaUrl,
      pagamentoUrl,
    })

    return NextResponse.json({
      success: true,
      leadId: storedLead.id,
      powerCrmSuccess: powerCrmResult.success,
      powerCrmQuotationCode: powerCrmResult.qttnCd,
      checkoutUrl,
      crmSuccess: crmResult.success,
      cardId: crmResult.cardId,
      vistoriaUrl: cobrarPix ? undefined : vistoriaUrl,
      pagamentoUrl,
      message: 'Cadastro realizado e salvo com sucesso!',
    })
  } catch (err: any) {
    console.error('Erro ao processar envio do lead:', err)
    return NextResponse.json(
      { error: 'Não foi possível concluir o cadastro agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
