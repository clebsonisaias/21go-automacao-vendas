import { LeadSubmissionPayload } from "./types";

interface AtendeHubMessagePayload {
  canalId?: string;
  telefone: string;
  nomeContato: string;
  deIdExterno: string;
  texto: string;
}

const ATENDEHUB_URL =
  process.env.ATENDEHUB_URL || "https://atendai.citmax.com.br";
const ATENDEHUB_API_KEY = process.env.ATENDEHUB_API_KEY || "";
const ATENDEHUB_CANAL_ID = process.env.ATENDEHUB_CANAL_ID || "";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://21go.seg.br";

/**
 * Envia mensagem automática pelo WhatsApp oficial da CITmax via AtendeHub / CITchat
 * quando um novo cliente realiza uma cotação.
 */
export async function sendWhatsAppQuoteMessage(lead: LeadSubmissionPayload): Promise<{
  success: boolean;
  error?: string;
  data?: any;
}> {
  if (!ATENDEHUB_API_KEY) {
    console.log(
      "[CITchat/AtendeHub] ATENDEHUB_API_KEY não configurada. Notificação WhatsApp ignorada."
    );
    return { success: false, error: "API key not configured" };
  }

  const phone = (lead.whatsapp || (lead as any).telefone || "").replace(/\D/g, "");
  const vistoriaUrl = `${APP_BASE_URL}/vistoria?leadId=${(lead as any).id || ""}`;

  const message = [
    `🚗 *Olá ${lead.nome}! Tudo bem?*`,
    `Aqui é da equipe *CITmax Proteção Veicular* (21Go).`,
    ``,
    `Recebemos a sua simulação para o veículo:`,
    `🚘 *${lead.vehicle.marca} ${lead.vehicle.modelo} (${lead.vehicle.ano})*`,
    `📋 *Plano Selecionado:* ${lead.planoEscolhidoNome}`,
    `💰 *Mensalidade estimada:* R$ ${lead.mensalidadeFinal.toFixed(2)}`,
    ``,
    `🛡️ *Seus Benefícios Inclusos:*`,
    `• Roubo, Furto e Perda Total 100% FIPE`,
    `• Assistência 24h em todo o Brasil (Guincho, Chaveiro, Pneu)`,
    `• Sem Análise de Perfil de Condutor`,
    `• 5% de Desconto Pontualidade no boleto`,
    ``,
    `Para ativarmos sua proteção com prioridade, envie os documentos e fotos da vistoria no link seguro abaixo:`,
    `👉 ${vistoriaUrl}`,
    ``,
    `Se tiver qualquer dúvida, basta responder esta mensagem! Estaremos à disposição.`,
  ].join("\n");

  try {
    const payload: AtendeHubMessagePayload = {
      ...(ATENDEHUB_CANAL_ID ? { canalId: ATENDEHUB_CANAL_ID } : {}),
      telefone: phone,
      nomeContato: lead.nome,
      deIdExterno: "21go-bot",
      texto: message,
    };

    const res = await fetch(`${ATENDEHUB_URL}/api/chat-externo/atendimentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ATENDEHUB_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[CITchat/AtendeHub] Erro ao enviar mensagem:", res.status, errText);
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    console.log("[CITchat/AtendeHub] Mensagem de cotação enviada com sucesso:", data);
    return { success: true, data };
  } catch (err: any) {
    console.error("[CITchat/AtendeHub] Falha na requisição:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Envia mensagem automática pelo WhatsApp oficial da CITmax via AtendeHub / CITchat
 * confirmando o recebimento da vistoria digital com documentos e fotos.
 */
export async function sendWhatsAppVistoriaConfirmation(params: {
  telefone: string;
  nome: string;
  placa: string;
}): Promise<{
  success: boolean;
  error?: string;
  data?: any;
}> {
  if (!ATENDEHUB_API_KEY) {
    return { success: false, error: "API key not configured" };
  }

  const phone = params.telefone.replace(/\D/g, "");

  const message = [
    `✅ *Vistoria Recebida com Sucesso!*`,
    ``,
    `Olá *${params.nome}*, recebemos seus documentos e fotos de vistoria para a placa *${params.placa}*.`,
    ``,
    `🔍 Nossa equipe já está realizando a conferência técnica da proposta.`,
    `Em breve você receberá a confirmação de ativação da sua proteção veicular.`,
    ``,
    `Obrigado por escolher a *CITmax & 21Go*!`,
  ].join("\n");

  try {
    const payload: AtendeHubMessagePayload = {
      ...(ATENDEHUB_CANAL_ID ? { canalId: ATENDEHUB_CANAL_ID } : {}),
      telefone: phone,
      nomeContato: params.nome,
      deIdExterno: "21go-bot",
      texto: message,
    };

    const res = await fetch(`${ATENDEHUB_URL}/api/chat-externo/atendimentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ATENDEHUB_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[CITchat/AtendeHub] Erro ao enviar confirmação de vistoria:", res.status, errText);
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.error("[CITchat/AtendeHub] Falha ao enviar confirmação de vistoria:", err.message);
    return { success: false, error: err.message };
  }
}
