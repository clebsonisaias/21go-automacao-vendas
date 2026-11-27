import { NextRequest } from 'next/server'
import {
  autorizarAtendai,
  chaveTelefone,
  guardarResposta,
  json,
  lerCotacao,
  respostaJaDada,
  RespostaCadastro,
} from '@/lib/atendai'
import { aplicarCotacao, aplicarCupom, CupomRecusado, registrarCadastro, validarCadastro } from '@/lib/cadastro'
import { updateLead } from '@/lib/db'
import { absolute } from '@/lib/links'
import { verifyQuoteToken } from '@/lib/quote-token'
import { rateLimit } from '@/lib/rate-limit'
import { LeadSubmissionPayload } from '@/lib/types'
import { PROMO_ADESAO } from '@/lib/promo-adesao'

export const dynamic = 'force-dynamic'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** O mesmo pedido chegando duas vezes ao mesmo tempo espera o primeiro (um cadastro só). */
const emAndamento = new Map<string, Promise<{ dados: RespostaCadastro | { erro: string }; status: number }>>()

/**
 * POST { cotacao, plano, email, telefone, telefoneConversa?, comAdesivo?, cupom? } + Idempotency-Key →
 * o mesmo cadastro do formulário do site (PowerCRM, painel, Telegram), com os
 * valores da cotação guardada. Não manda a mensagem de WhatsApp dos documentos:
 * o chat entrega o link na própria conversa.
 *
 * `telefone` é o de contato que o cliente informou; `telefoneConversa`, o WhatsApp da
 * conversa do chat. Se forem diferentes, o da conversa fica no cadastro para o chat achar
 * a situação e receber os documentos dele.
 */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-contratacao', 20, 10 * 60 * 1000)) {
    return json({ erro: 'Muitos cadastros seguidos. Tente de novo em alguns minutos.' }, 429)
  }

  const chave = (req.headers.get('idempotency-key') || '').trim()
  if (chave.length < 8 || chave.length > 200) {
    return json({ erro: 'Falta a Idempotency-Key do pedido.' }, 400)
  }
  const jaDada = respostaJaDada(chave)
  if (jaDada) return json(jaDada, 200)

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }

  let pedido = emAndamento.get(chave)
  if (!pedido) {
    pedido = cadastrar(chave, corpo).finally(() => emAndamento.delete(chave))
    emAndamento.set(chave, pedido)
  }
  const { dados, status } = await pedido
  return json(dados, status)
}

async function cadastrar(
  chave: string,
  corpo: Record<string, unknown>
): Promise<{ dados: RespostaCadastro | { erro: string }; status: number }> {
  const cotacao = lerCotacao(String(corpo?.cotacao ?? ''))
  if (!cotacao) {
    return { dados: { erro: 'A cotação expirou ou não existe. Faça uma nova cotação.' }, status: 410 }
  }
  const plano = String(corpo?.plano ?? '').slice(0, 40)
  const verificada = verifyQuoteToken(cotacao.token, plano)
  if (!verificada || !verificada.vehicle) {
    return {
      dados: { erro: 'Esse plano não é desta cotação, ou a cotação expirou. Faça uma nova cotação.' },
      status: 410,
    }
  }

  // Mesma regra do formulário: com adesivo se pedido e elegível; senão, pontualidade.
  const comAdesivo = corpo?.comAdesivo === true && cotacao.elegivelAdesivo
  const payload: LeadSubmissionPayload = {
    nome: '',
    whatsapp: String(corpo?.telefone ?? ''),
    email: String(corpo?.email ?? '')
      .trim()
      .toLowerCase(),
    veiculoTrabalho: cotacao.usoApp,
    placa: cotacao.placa,
    planoEscolhidoId: plano,
    planoEscolhidoNome: verificada.plan.name,
    mensalidadeOriginal: verificada.plan.monthly,
    mensalidadeFinal: comAdesivo ? verificada.plan.adesivo : verificada.plan.pontualidade,
    ativacao: verificada.plan.ativacao,
    comAdesivo,
    // Veio pela conversa do WhatsApp (AtendeHub).
    origem: { canal: 'WhatsApp', utm_source: 'whatsapp', utm_medium: 'chat' },
    vehicle: { ...verificada.vehicle, placa: cotacao.placa },
    quoteToken: cotacao.token,
    powercrmMeta: verificada.meta,
  }

  const invalido = validarCadastro(payload)
  if (invalido) return { dados: { erro: invalido }, status: 400 }
  const recusa = aplicarCotacao(payload)
  if (recusa) return { dados: { erro: recusa }, status: 410 }
  // Cupom de desconto na adesão (opcional): recusado, o texto vai para o cliente.
  const recusaCupom = aplicarCupom(payload, corpo?.cupom, 'chat')
  if (recusaCupom) return { dados: { erro: recusaCupom }, status: 400 }

  try {
    const feito = await registrarCadastro(payload, { enviarWhatsApp: false, origem: 'chat' })
    const conversa = String(corpo?.telefoneConversa ?? '').replace(/\D/g, '').slice(0, 15)
    if (chaveTelefone(conversa) && chaveTelefone(conversa) !== chaveTelefone(payload.whatsapp)) {
      updateLead(feito.lead.ref, (l) => {
        l.atendaiTelefone = conversa
      })
    }
    const resposta: RespostaCadastro = {
      protocolo: feito.lead.id,
      linkDocumentos: absolute(feito.vistoriaUrl),
      mensagem: `Cadastro feito!${
        payload.cupom
          ? payload.cupom.codigo === PROMO_ADESAO.codigo
            ? ` Black 21Go aplicada: a adesão fica em ${brl(payload.ativacao)} (era ${brl(payload.ativacaoOriginal ?? payload.ativacao)}).`
            : ` Cupom ${payload.cupom.codigo} aplicado: a adesão fica em ${brl(payload.ativacao)} (era ${brl(payload.ativacaoOriginal ?? payload.ativacao)}).`
          : ''
      } Agora é só enviar a CNH ou o RG, o documento do carro e um comprovante de residência. A adesão só é paga no fim, com a vistoria aprovada.`,
    }
    guardarResposta(chave, resposta)
    return { dados: resposta, status: 201 }
  } catch (err) {
    if (err instanceof CupomRecusado) return { dados: { erro: err.message }, status: 400 }
    console.error('[atendai] cadastro falhou:', err instanceof Error ? err.message : err)
    return { dados: { erro: 'Não foi possível concluir o cadastro agora. Tente de novo em instantes.' }, status: 502 }
  }
}
