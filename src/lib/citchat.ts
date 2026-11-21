import { LeadSubmissionPayload } from "./types";

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
const CITCHAT_GATEWAY_TOKEN =
  process.env.CITCHAT_GATEWAY_TOKEN || 'ImQq5Lek2czuha3IPmPdXJ8EnBejCXpe'

const ATENDEHUB_URL =
  process.env.ATENDEHUB_URL || 'https://atendai.citmax.com.br'
const ATENDEHUB_API_KEY = process.env.ATENDEHUB_API_KEY || ''
const ATENDEHUB_CANAL_ID = process.env.ATENDEHUB_CANAL_ID || ''
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br'

/**
 * Envia mensagem direta pelo Gateway do CITchat / AtendeHub (WhatsApp Oficial CITmax)
 */
export async function sendCitchatMessage(
  recipientRaw: string,
  body: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  let recipient = recipientRaw.replace(/\D/g, '')
  if (!recipient) return { success: false, error: 'Telefone vazio' }
  if (!recipient.startsWith('55')) recipient = `55${recipient}`

  // 1. Tenta envio pelo Gateway rápido do CITchat
  if (CITCHAT_GATEWAY_TOKEN) {
    try {
      const url = `${CITCHAT_GATEWAY_URL}?token=${encodeURIComponent(CITCHAT_GATEWAY_TOKEN)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, body }),
      })

      if (res.ok) {
        const data = await res.json()
        console.log('[CITchat Gateway] Mensagem enviada com sucesso:', data)
        return { success: true, data }
      }
      const errTxt = await res.text()
      console.warn('[CITchat Gateway] Falha no envio via gateway:', res.status, errTxt)
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
export async function sendWhatsAppQuoteMessage(lead: LeadSubmissionPayload): Promise<{
  success: boolean
  error?: string
  data?: any
}> {
  const phone = (lead.whatsapp || (lead as any).telefone || '').replace(/\D/g, '')
  if (!phone) return { success: false, error: 'Telefone ausente' }

  const message = [
    `🚗 *Olá ${lead.nome}! Tudo bem?*`,
    `Aqui é da equipe *CITmax Proteção Veicular* (Franquia Oficial 21Go).`,
    ``,
    `Recebemos a sua simulação para o veículo:`,
    `🚘 *${lead.vehicle.marca} ${lead.vehicle.modelo} (${lead.vehicle.ano})*`,
    `📋 *Plano Selecionado:* ${lead.planoEscolhidoNome}`,
    `💰 *Mensalidade estimada:* R$ ${lead.mensalidadeFinal.toFixed(2)}/mês`,
    ``,
    `🛡️ *Seus Benefícios Inclusos:*`,
    `• Roubo, Furto e Perda Total 100% FIPE`,
    `• Assistência 24h em todo o Brasil (Guincho, Chaveiro, Pneu)`,
    `• Sem Análise de Perfil de Condutor`,
    `• 5% de Desconto Pontualidade no boleto`,
    ``,
    `📸 *Próximo Passo — Vistoria Oficial 21Go (App Visto):*`,
    `Para validar sua adesão com cobertura imediata, a 21Go exige a vistoria digital com câmera ao vivo e GPS.`,
    ``,
    `Nossa equipe da CITmax já está acompanhando seu atendimento! Se tiver qualquer dúvida, é só responder esta mensagem.`,
  ].join('\n')

  return sendCitchatMessage(phone, message)
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
    `✅ *Vistoria Recebida com Sucesso!*`,
    ``,
    `Olá *${params.nome}*, recebemos seus documentos e fotos de vistoria para a placa *${params.placa}*.`,
    ``,
    `🔍 Nossa equipe já está realizando a conferência técnica da proposta.`,
    `Em breve você receberá a confirmação de ativação da sua proteção veicular.`,
    ``,
    `Obrigado por escolher a *CITmax & 21Go*!`,
  ].join('\n')

  return sendCitchatMessage(phone, message)
}
