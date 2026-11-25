import { LeadSubmissionPayload } from "./types";
import { absolute } from './links'
import { DOCUMENTOS_EM_PDF } from './vistoria-slots'

interface AtendeHubMessagePayload {
  canalId?: string;
  telefone: string;
  nomeContato: string;
  deIdExterno: string;
  texto: string;
}

const CITCHAT_GATEWAY_URL =
  process.env.CITCHAT_GATEWAY_URL ||
  'https://atendehub.170.82.252.195.sslip.io/gateway/sms'
// Sem token padrão no código: o gateway só é usado se CITCHAT_GATEWAY_TOKEN estiver definido.
const CITCHAT_GATEWAY_TOKEN = process.env.CITCHAT_GATEWAY_TOKEN || ''

const ATENDEHUB_URL =
  process.env.ATENDEHUB_URL || 'https://atendai.citmax.com.br'
const ATENDEHUB_API_KEY = process.env.ATENDEHUB_API_KEY || ''
const ATENDEHUB_CANAL_ID = process.env.ATENDEHUB_CANAL_ID || ''

/**
 * Envia mensagem direta pelo Gateway do CITchat / AtendeHub (WhatsApp Oficial CITmax)
 */
/** "Olá Maria" (primeiro nome) ou só "Olá" quando o nome ainda não veio dos documentos. */
function ola(nome?: string, negrito = false): string {
  const primeiro = String(nome || '').trim().split(/\s+/)[0]
  if (!primeiro || primeiro === 'Cliente') return 'Olá'
  const n = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()
  return negrito ? `Olá *${n}*` : `Olá ${n}`
}

/**
 * Template da Meta para quando o cliente está fora da janela de 24h (cliente novo quase sempre está).
 * O gateway do AtendeHub manda o texto livre dentro da janela e, fora dela, este template com as
 * variáveis; sem `template`, usa o template de reserva da CITmax com o texto inteiro numa variável.
 * Nomes e variáveis: docs/CONTEXTO_IA.md (templates `citmax_21go_*`).
 */
export interface TemplateWa {
  template: string
  params: string[]
}

/** Valor em reais como vai no template: 269,53 */
const reais = (v: number) => v.toFixed(2).replace('.', ',')

export async function sendCitchatMessage(
  recipientRaw: string,
  body: string,
  tpl?: TemplateWa
): Promise<{ success: boolean; data?: any; error?: string }> {
  let recipient = recipientRaw.replace(/\D/g, '')
  if (!recipient) return { success: false, error: 'Telefone vazio' }
  if (!recipient.startsWith('55')) recipient = `55${recipient}`

  // Valor vazio o gateway recusa (400) e a mensagem se perderia: sem template, vai a
  // reserva do produto 21Go com o texto inteiro.
  if (tpl && tpl.params.some((v) => !String(v ?? '').trim())) {
    console.warn(`[CITchat Gateway] ${tpl.template}: valor vazio, vai sem template`)
    tpl = undefined
  }

  // 1. Tenta envio pelo Gateway rápido do CITchat
  if (CITCHAT_GATEWAY_TOKEN) {
    try {
      const url = `${CITCHAT_GATEWAY_URL}?token=${encodeURIComponent(CITCHAT_GATEWAY_TOKEN)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, body, ...(tpl ? { template: tpl.template, params: tpl.params } : {}) }),
        signal: AbortSignal.timeout(30000),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        // Só o resultado: nada de telefone nem texto no log.
        console.log(`[CITchat Gateway] ${data?.status || 'enviado'}${tpl ? ` (${tpl.template})` : ''}`)
        return { success: true, data }
      }
      const err = await res.json().catch(() => ({}))
      const motivo = typeof err?.error === 'string' ? err.error.slice(0, 200) : `HTTP ${res.status}`
      console.warn(`[CITchat Gateway] não enviou${tpl ? ` (${tpl.template})` : ''}: ${res.status} ${motivo}`)
      // 4xx é resposta definitiva do gateway (ex.: fora da janela sem template): não insiste por outro caminho.
      if (res.status >= 400 && res.status < 500) return { success: false, error: motivo }
    } catch (e: any) {
      console.error('[CITchat Gateway] Erro de rede no gateway:', e.message)
    }
  }

  // 2. Fallback para AtendeHub Chat Externo
  if (ATENDEHUB_API_KEY) {
    try {
      const res = await fetch(`${ATENDEHUB_URL}/api/chat-externo/atendimentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ATENDEHUB_API_KEY}`,
        },
        body: JSON.stringify({
          ...(ATENDEHUB_CANAL_ID ? { canalId: ATENDEHUB_CANAL_ID } : {}),
          telefone: recipient,
          nomeContato: 'Associado 21Go',
          deIdExterno: '21go-bot',
          texto: body,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return { success: true, data }
      }
    } catch (err: any) {
      console.error('[CITchat Fallback] Erro:', err.message)
    }
  }

  return { success: false, error: 'Não foi possível enviar mensagem pelo CITchat' }
}

/**
 * Envia mensagem automática pelo WhatsApp oficial da CITmax via AtendeHub / CITchat
 * quando um novo cliente realiza uma cotação.
 */
export async function sendWhatsAppQuoteMessage(
  lead: LeadSubmissionPayload,
  options?: { quotationCode?: string; vistoriaUrl?: string; pagamentoUrl?: string }
): Promise<{
  success: boolean
  error?: string
  data?: any
}> {
  const phone = (lead.whatsapp || (lead as any).telefone || '').replace(/\D/g, '')
  if (!phone) return { success: false, error: 'Telefone ausente' }

  const checkoutUrl = options?.quotationCode
    ? `https://checkout.cotacao.me/myplanquot?h=${options.quotationCode}`
    : null

  const vistoriaUrl = options?.vistoriaUrl
    ? absolute(options.vistoriaUrl)
    : `${absolute('/vistoria')}?placa=${encodeURIComponent(lead.placa || lead.vehicle.placa || '')}&nome=${encodeURIComponent(lead.nome || '')}`
  const pagamentoUrl = options?.pagamentoUrl ? absolute(options.pagamentoUrl) : null

  const message = [
    `🚗 *${ola(lead.nome)}! Tudo bem?*`,
    `Aqui é da equipe *CITmax Proteção Veicular* (franquia autorizada da 21Go).`,
    ``,
    `Recebemos a sua simulação oficial para o veículo:`,
    `🚘 *${lead.vehicle.marca} ${lead.vehicle.modelo} (${lead.vehicle.ano})*`,
    `📋 *Plano Selecionado:* ${lead.planoEscolhidoNome}`,
    `💰 *Mensalidade:* R$ ${lead.mensalidadeFinal.toFixed(2)}/mês`,
    `⚡ *Taxa de Ativação (Pix único):* R$ ${lead.ativacao.toFixed(2)}`,
    ``,
    `🛡️ *Seus Benefícios Inclusos:*`,
    `• Roubo, Furto e Perda Total 100% FIPE`,
    `• Assistência 24h em todo o Brasil (Guincho, Chaveiro, Pneu)`,
    `• Sem Análise de Perfil de Condutor`,
    `• 5% de Desconto Pontualidade na mensalidade`,
    ``,
    ...(pagamentoUrl
      ? [
          `💳 *1. Pague a taxa de adesão via Pix:*`,
          `Abra o link, copie o código ou leia o QR Code. A confirmação é automática:`,
          `👉 ${pagamentoUrl}`,
          ``,
          `📸 *2. Vistoria digital:*`,
          `Assim que o Pix for confirmado, enviamos aqui o link da vistoria (fotos pelo celular).`,
          ``,
        ]
      : checkoutUrl
      ? [
          `✍️ *1. Assinar e Ativar Imediatamente Online:*`,
          `Você pode assinar o termo de adesão e pagar o Pix de ativação agora mesmo no link seguro oficial:`,
          `👉 ${checkoutUrl}`,
          ``,
        ]
      : []),
    ...(pagamentoUrl
      ? []
      : [
          `📄 *Próximo passo: envie seus documentos*`,
          `Abra o link e envie CNH ou RG, documento do carro e comprovante de residência, ${DOCUMENTOS_EM_PDF}. Depois enviamos aqui o link da vistoria (App Visto); a adesão é paga só no final, com a vistoria aprovada:`,
          `👉 ${vistoriaUrl}`,
          ``,
        ]),
    `Qualquer dúvida, é só responder esta mensagem diretamente aqui no WhatsApp! 🤝`,
  ].join('\n')

  // Template só no fluxo normal (documentos primeiro); os caminhos antigos caem no template de reserva.
  const tpl: TemplateWa | undefined =
    !pagamentoUrl && !checkoutUrl
      ? {
          template: 'citmax_21go_documentos',
          params: [
            `${lead.vehicle.marca} ${lead.vehicle.modelo} ${lead.vehicle.ano}`,
            lead.planoEscolhidoNome,
            reais(lead.mensalidadeFinal),
            vistoriaUrl,
          ],
        }
      : undefined

  return sendCitchatMessage(phone, message, tpl)
}

/**
 * Envia mensagem automática pelo WhatsApp oficial da CITmax via AtendeHub / CITchat
 * confirmando o recebimento da vistoria digital com documentos e fotos.
 */
export async function sendWhatsAppVistoriaConfirmation(params: {
  telefone: string
  nome: string
  placa: string
}): Promise<{
  success: boolean
  error?: string
  data?: any
}> {
  const phone = params.telefone.replace(/\D/g, '')

  const message = [
    `✅ *Documentos recebidos!*`,
    ``,
    `${ola(params.nome, true)}, recebemos seus documentos para a placa *${params.placa}*.`,
    ``,
    `Próximo passo: em breve enviamos aqui o link da vistoria oficial da 21Go (App Visto), para as fotos do veículo.`,
    `A taxa de adesão (Pix) é o último passo, depois da vistoria aprovada.`,
    ``,
    `Obrigado por escolher a *CITmax & 21Go*!`,
  ].join('\n')

  return sendCitchatMessage(phone, message, { template: 'citmax_21go_docs_recebidos', params: [params.placa] })
}

/**
 * Avisa o cliente que o Pix da adesão foi confirmado e envia o link da vistoria digital.
 */
export async function sendWhatsAppAdesaoConfirmada(params: {
  telefone: string
  nome: string
  vistoriaUrl?: string
  valor: number
}): Promise<{ success: boolean; error?: string; data?: any }> {
  const message = [
    `✅ *Pagamento confirmado!*`,
    ``,
    `${ola(params.nome, true)}, recebemos o Pix da taxa de adesão (R$ ${params.valor.toFixed(2)}). Obrigado!`,
    ``,
    ...(params.vistoriaUrl
      ? [
          `📄 *Falta enviar seus documentos:*`,
          `👉 ${params.vistoriaUrl}`,
        ]
      : [
          `🎉 Seu cadastro está completo. Os seus dados de acesso foram enviados para o seu e-mail cadastrado. Baixe o aplicativo 21Go na loja do seu celular para acompanhar sua proteção. 🤝`,
        ]),
  ].join('\n')

  return sendCitchatMessage(
    params.telefone,
    message,
    params.vistoriaUrl ? undefined : { template: 'citmax_21go_pagamento_app', params: [reais(params.valor)] }
  )
}

/** Envia ao cliente o link do App Visto (vistoria oficial da 21Go, gerado no CRM). */
export async function sendWhatsAppAppVisto(params: {
  telefone: string
  nome: string
  url: string
}): Promise<{ success: boolean; error?: string; data?: any }> {
  const message = [
    `📸 *Sua vistoria está liberada!*`,
    ``,
    `${ola(params.nome, true)}, faça agora a vistoria oficial da 21Go no App Visto (fotos do veículo pelo celular, com câmera ao vivo e GPS):`,
    `👉 ${params.url}`,
    ``,
    `Depois das fotos, a equipe da 21Go analisa a vistoria (pode levar um tempo). Quando aprovar, enviamos aqui e no seu e-mail o Pix da adesão, que é o último passo.`,
  ].join('\n')

  return sendCitchatMessage(params.telefone, message, { template: 'citmax_21go_vistoria', params: [params.url] })
}

/** Vistoria aprovada: envia o link do Pix da adesão (último passo). */
export async function sendWhatsAppAdesaoLiberada(params: {
  telefone: string
  nome: string
  placa: string
  pagamentoUrl: string
  valor: number
}): Promise<{ success: boolean; error?: string; data?: any }> {
  const message = [
    `🎉 *Vistoria aprovada!*`,
    ``,
    `${ola(params.nome, true)}, a vistoria do veículo de placa *${params.placa}* foi aprovada.`,
    ``,
    `💳 *Último passo: pague a taxa de adesão (R$ ${params.valor.toFixed(2)}) via Pix.*`,
    `Abra o link, copie o código ou leia o QR Code. A confirmação é automática:`,
    `👉 ${params.pagamentoUrl}`,
  ].join('\n')

  return sendCitchatMessage(params.telefone, message, {
    template: 'citmax_21go_pix_adesao',
    params: [params.placa, reais(params.valor), params.pagamentoUrl],
  })
}

/** Avisa o cliente que a vistoria foi aprovada pela equipe. */
export async function sendWhatsAppVistoriaAprovada(params: {
  telefone: string
  nome: string
  placa: string
}): Promise<{ success: boolean; error?: string; data?: any }> {
  const message = [
    `🎉 *Vistoria aprovada!*`,
    ``,
    `${ola(params.nome, true)}, a vistoria do veículo de placa *${params.placa}* foi aprovada pela nossa equipe.`,
    ``,
    `Estamos concluindo a sua associação. A 21Go envia os seus dados de acesso e as mensalidades. 🤝`,
  ].join('\n')

  return sendCitchatMessage(params.telefone, message)
}

/**
 * Lembrete de etapa parada (ver lembretes.ts). Dentro da janela de 24h vai o texto; fora dela,
 * o mesmo template da etapa (documentos, vistoria ou Pix), que já leva o link certo.
 */
export async function sendWhatsAppLembrete(params: {
  etapa: 'documentos' | 'vistoria' | 'pagamento'
  telefone: string
  nome: string
  veiculo: string
  plano: string
  mensalidade: number
  placa: string
  valor: number
  url: string
}): Promise<{ success: boolean; error?: string; data?: any }> {
  const { etapa, url } = params
  if (etapa === 'documentos') {
    const message = [
      `${ola(params.nome)}! Seu cadastro da proteção 21Go para o ${params.veiculo} está quase pronto: falta enviar os documentos (CNH ou RG, documento do carro e comprovante de residência).`,
      ``,
      `É rapidinho pelo link: ${url}`,
      ``,
      `Se preferir, mande aqui mesmo na conversa, ${DOCUMENTOS_EM_PDF}.`,
    ].join('\n')
    return sendCitchatMessage(params.telefone, message, {
      template: 'citmax_21go_documentos',
      // Mensalidade ausente vira valor vazio: a mensagem vai pela reserva do produto, sem quebrar.
      params: [params.veiculo, params.plano, Number.isFinite(params.mensalidade) ? reais(params.mensalidade) : '', url],
    })
  }
  if (etapa === 'vistoria') {
    const message = [
      `${ola(params.nome)}! Falta só a vistoria do seu veículo na 21Go: são as fotos pelo celular, neste link: ${url}`,
      ``,
      `Depois das fotos, a equipe analisa e o Pix da adesão chega aqui.`,
    ].join('\n')
    return sendCitchatMessage(params.telefone, message, { template: 'citmax_21go_vistoria', params: [url] })
  }
  const message = [
    `${ola(params.nome)}! A vistoria do veículo de placa ${params.placa} foi aprovada e falta só a taxa de adesão (R$ ${reais(params.valor)}) por Pix: ${url}`,
    ``,
    `Se preferir, peça o código Pix aqui na conversa.`,
  ].join('\n')
  return sendCitchatMessage(params.telefone, message, {
    template: 'citmax_21go_pix_adesao',
    params: [params.placa, reais(params.valor), url],
  })
}
