import { getStoredLeads, StoredLead, updateLead } from './db'
import { sendWhatsAppLembrete } from './citchat'
import { mpEnabled } from './mercadopago'
import { absolute, pagamentoPath, vistoriaPath } from './links'

/**
 * Lembrete de etapa parada: cadastro sem documentos, vistoria liberada e não feita, ou Pix da
 * adesão não pago. Vai um WhatsApp curto com o link daquela etapa (o template da etapa, fora da
 * janela de 24h); se o cliente responder, a conversa segue com a IA do chat.
 *
 * Regras:
 * - A contagem começa quando o lembrete vê o cadastro naquela etapa (`lembrete.desde`): trocar
 *   de etapa, ou voltar a uma etapa depois de sair dela, zera a contagem.
 * - Cadastro visto pela primeira vez com mais de 2 dias (os que já existiam no deploy) fica sem
 *   lembrete na etapa em que está: não se manda template a quem abandonou o cadastro há tempo.
 * - Vai para o WhatsApp da conversa do chat (`atendaiTelefone`), ou o do formulário do site;
 *   nunca para o telefone de contato digitado no chat.
 * - Vistoria só com a etapa lida do CRM (criada ou em andamento); Pix só se dá para pagar.
 * - 1º lembrete com 24 h na etapa, 2º com 72 h (e 48 h depois do 1º). Nunca mais de 2 por etapa.
 * - Só das 9h às 20h de Brasília, até 15 por rodada, e só cadastros do site com até 30 dias.
 * - O envio é marcado antes de sair: falha do WhatsApp não vira repetição.
 * - Encerrar o cadastro no /admin para os lembretes.
 */

export type EtapaLembrete = 'documentos' | 'vistoria' | 'pagamento'

const HORA = 60 * 60 * 1000
const PRIMEIRO = 24 * HORA
const SEGUNDO = 72 * HORA
const ENTRE_ENVIOS = 48 * HORA
const IDADE_MAXIMA = 30 * 24 * HORA
const POR_RODADA = 10
const NOVO_ATE = 2 * 24 * HORA
const MAX_TENTATIVAS_PIX = 5
const HORA_INICIO = 9
const HORA_FIM = 20 // até 19:59

/** Etapa em que o cliente está parado, ou null se não há o que lembrar. */
export function etapaParaLembrete(l: StoredLead): EtapaLembrete | null {
  if (!l.whatsapp || !l.ref) return null
  // Só cadastros feitos no site ou no chat (os importados do CRM têm outro formato de id).
  if (!(l.id.startsWith('lead_') || !l.id.includes('-'))) return null
  if (l.pagamento?.paidAt) return null
  if (l.status === 'aguardando_pagamento') {
    // Pix que dá para pagar: o do site ligado e cobranças ainda disponíveis (senão a página diz "Limite").
    return l.ativacao > 0 && mpEnabled() && (l.pagamento?.attempt ?? 0) < MAX_TENTATIVAS_PIX ? 'pagamento' : null
  }
  if (l.status === 'vistoria_enviada') {
    // Só com a etapa lida do CRM: sem ela (link colado à mão, acompanhamento desligado) não se sabe
    // se as fotos já foram feitas, e o lembrete chegaria a quem já fez.
    const st = l.crmVistoria?.vistoriaStatus
    return l.appVistoUrl && (st === 'criada' || st === 'em_andamento') ? 'vistoria' : null
  }
  if (l.status === 'pendente_vistoria' && !l.vistoriaData?.enviadoEm) return 'documentos'
  return null
}

function horaBrasilia(agora: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora))
}

/** Uma rodada: atualiza a etapa de cada cadastro e manda os lembretes que já venceram. */
export async function lembretesTick(agora = new Date()): Promise<number> {
  const agoraMs = agora.getTime()
  const agoraIso = agora.toISOString()
  const dentroDoHorario = (() => {
    const h = horaBrasilia(agora)
    return h >= HORA_INICIO && h < HORA_FIM
  })()

  let enviados = 0
  for (const lead of getStoredLeads()) {
    if (lead.status === 'cancelado') continue
    if (agoraMs - new Date(lead.createdAt).getTime() > IDADE_MAXIMA) continue
    const etapa = etapaParaLembrete(lead)
    if (!etapa) {
      // Saiu da etapa (vistoria em análise, Pix pago…): se voltar a ela, a contagem recomeça.
      if (lead.lembrete && !lead.lembrete.saiuEm) {
        updateLead(lead.ref, (l) => {
          if (l.lembrete && !l.lembrete.saiuEm && !etapaParaLembrete(l)) l.lembrete.saiuEm = agoraIso
        })
      }
      continue
    }

    // Etapa nova, de volta à etapa, ou primeira vez visto: só marca o começo da contagem.
    if (lead.lembrete?.etapa !== etapa || lead.lembrete.saiuEm) {
      const antigo = !lead.lembrete && agoraMs - new Date(lead.createdAt).getTime() > NOVO_ATE
      updateLead(lead.ref, (l) => {
        if (etapaParaLembrete(l) !== etapa) return
        if (l.lembrete?.etapa === etapa && !l.lembrete.saiuEm) return
        l.lembrete = { etapa, desde: agoraIso, enviados: [], ...(antigo ? { semLembrete: true } : {}) }
      })
      continue
    }
    if (lead.lembrete.semLembrete) continue

    if (!dentroDoHorario || enviados >= POR_RODADA) continue
    const { desde, enviados: jaEnviados } = lead.lembrete
    const naEtapa = agoraMs - new Date(desde).getTime()
    const ultimo = jaEnviados.length ? new Date(jaEnviados[jaEnviados.length - 1]).getTime() : 0
    const vence =
      (jaEnviados.length === 0 && naEtapa >= PRIMEIRO) ||
      (jaEnviados.length === 1 && naEtapa >= SEGUNDO && agoraMs - ultimo >= ENTRE_ENVIOS)
    if (!vence) continue

    // Marca antes de mandar (troca condicional): duas rodadas nunca mandam o mesmo lembrete.
    let marcado = false
    const atual = updateLead(lead.ref, (l) => {
      if (l.status === 'cancelado' || etapaParaLembrete(l) !== etapa) return
      if (l.lembrete?.etapa !== etapa || l.lembrete.enviados.length !== jaEnviados.length) return
      l.lembrete.enviados.push(agoraIso)
      marcado = true
    })
    if (!marcado || !atual) continue
    // O WhatsApp da conversa do chat, ou o do formulário: nunca o contato digitado no chat.
    const destino = atual.atendaiTelefone || atual.whatsapp
    enviados++

    const url =
      etapa === 'pagamento'
        ? absolute(pagamentoPath(atual.ref))
        : etapa === 'vistoria'
          ? atual.appVistoUrl!
          : absolute(vistoriaPath(atual))
    const v = atual.vehicle
    const r = await sendWhatsAppLembrete({
      etapa,
      telefone: destino,
      nome: atual.nome,
      veiculo: [v?.marca, v?.modelo, v?.ano].filter(Boolean).join(' ') || 'seu veículo',
      plano: atual.planoEscolhidoNome,
      mensalidade: atual.mensalidadeFinal,
      placa: atual.placa || v?.placa || 'do veículo',
      valor: atual.ativacao,
      url,
    }).catch((e: unknown) => ({ success: false, error: e instanceof Error ? e.message : String(e) }))
    // Só o resultado: nada de telefone nem nome no log.
    console.log(`[Lembretes] ${etapa} #${atual.lembrete?.enviados.length}: ${r.success ? 'enviado' : `não enviado (${r.error})`}`)
  }
  return enviados
}
