import { NextRequest, NextResponse } from 'next/server'
import { verifyQuoteToken } from '@/lib/quote-token'
import { limitePorChave, rateLimit } from '@/lib/rate-limit'
import { ufDoDdd } from '@/lib/tabela-nordeste'
import { chaveTelefone } from '@/lib/atendai'
import { limparOrigem } from '@/lib/origem'
import { codigoDoLink } from '@/lib/cupom-compartilhar'
import { adesaoPromo, diaDaPromo, fimDaPromo, promoAdesaoAtiva } from '@/lib/promo-adesao'
import { mpEnabled } from '@/lib/mercadopago'
import { cotacaoRepetida, excedeuNumero, normalizarCelular, normalizarPlaca, telefoneFinal, validarPedido } from '@/lib/cotacao-whatsapp'
import { cotacaoEntregue, criarCotacaoWhatsApp, enviarCotacaoPedida, lerCotacoesWhatsApp } from '@/lib/cotacao-whatsapp-envio'

export const dynamic = 'force-dynamic'

const DIA = 24 * 60 * 60 * 1000
const MAX_DIA = Number(process.env.COTACAO_WHATSAPP_MAX_DIA) || 150
const WHATS_CITMAX = 'https://wa.me/558420182178'

const erro = (error: string, status: number) => NextResponse.json({ success: false, error }, { status })

/**
 * POST { whatsapp, quoteToken, planoId, pedido, placa?, origem?, cupom?, site } → manda a cotação
 * pelo WhatsApp e guarda para os lembretes (cotacao-whatsapp.ts). Os valores da mensagem vêm do
 * token assinado da cotação: nada que o navegador digita vai no texto, além do número.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(req, 'cotacao-whatsapp', 5, 10 * 60 * 1000)) {
    return erro('Muitos pedidos seguidos. Tente de novo em alguns minutos.', 429)
  }
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return erro('Pedido inválido.', 400)
  // Campo escondido que só robô preenche: responde como se tivesse dado certo e não faz nada.
  if (typeof b.site === 'string' && b.site.trim()) return NextResponse.json({ success: true, final: '' })

  const whatsapp = normalizarCelular(b.whatsapp, ufDoDdd)
  if (!whatsapp) return erro('Confira o WhatsApp: celular com DDD, como (84) 99999-8888.', 400)
  const pedido = validarPedido(b.pedido)
  if (typeof pedido === 'string') return erro(pedido, 400)
  const planoId = typeof b.planoId === 'string' ? b.planoId : ''
  const cotacao = verifyQuoteToken(b.quoteToken, planoId)
  if (!cotacao || cotacao.fipe !== pedido.codFipe) {
    return erro('A cotação venceu. Busque o veículo de novo para receber os valores atualizados.', 409)
  }

  if (!limitePorChave('cotacao-whatsapp-numero', chaveTelefone(whatsapp) || whatsapp, 2, DIA)) {
    return erro('Este número já recebeu cotações hoje. Se precisar, fale com a gente pelo WhatsApp.', 429)
  }

  let lista
  try {
    lista = lerCotacoesWhatsApp()
  } catch (e) {
    console.error('[cotacao-whatsapp] leitura:', e instanceof Error ? e.message : 'erro')
    return erro('Não foi possível guardar a cotação agora. Tente de novo em instantes.', 500)
  }
  const agora = Date.now()
  const repetida = cotacaoRepetida(lista, whatsapp, pedido.codFipe, agora, chaveTelefone)
  if (repetida && cotacaoEntregue(repetida)) return NextResponse.json({ success: true, final: telefoneFinal(whatsapp), jaEnviada: true })
  // A primeira tentativa não chegou: tenta de novo na mesma cotação (não cria outra).
  if (repetida) {
    const ok = await enviarCotacaoPedida(repetida)
    return ok
      ? NextResponse.json({ success: true, final: telefoneFinal(whatsapp) })
      : NextResponse.json(
          { success: false, error: 'O WhatsApp não aceitou o envio agora. Chame a gente direto pelo WhatsApp.', whatsappCitmax: WHATS_CITMAX },
          { status: 502 }
        )
  }
  if (excedeuNumero(lista, whatsapp, agora, chaveTelefone)) {
    return erro('Este número já recebeu várias cotações esta semana. Se precisar, fale com a gente pelo WhatsApp.', 429)
  }
  if (lista.filter((c) => agora - Date.parse(c.criadaEm) < DIA).length >= MAX_DIA) {
    return erro('Não conseguimos enviar agora. Fale com a gente pelo WhatsApp.', 503)
  }

  // Veículo só o do token assinado (o nome digitado no navegador não vai na mensagem).
  const v = cotacao.vehicle
  if (!v?.marca || !v?.modelo) {
    return erro('A cotação venceu. Busque o veículo de novo para receber os valores atualizados.', 409)
  }
  const emDia = cotacao.plan.pontualidade > 0 && cotacao.plan.pontualidade < cotacao.plan.monthly
  const c = criarCotacaoWhatsApp({
    whatsapp,
    placa: normalizarPlaca(b.placa) || undefined,
    uf: cotacao.uf,
    pedido,
    veiculo: { marca: v.marca, modelo: v.modelo, ano: String(v.ano || ''), fipeValue: v.fipeValue || 0 },
    plano: {
      id: cotacao.plan.id,
      nome: cotacao.plan.name,
      mensalidade: emDia ? cotacao.plan.pontualidade : cotacao.plan.monthly,
      emDia,
      ativacao: cotacao.plan.ativacao,
      regional: !!cotacao.plan.regional,
      // Black 21Go: o cadastro de hoje paga R$ 1 (cadastro.ts); a mensagem diz o valor e o prazo.
      ...(promoAdesaoAtiva() && mpEnabled()
        ? { promoAdesao: adesaoPromo(cotacao.plan.ativacao), promoAte: fimDaPromo(), promoDia: diaDaPromo() }
        : {}),
    },
    cupom: codigoDoLink(b.cupom) || undefined,
    origem: limparOrigem(b.origem),
  })

  const ok = await enviarCotacaoPedida(c)
  if (!ok) {
    return NextResponse.json(
      { success: false, error: 'O WhatsApp não aceitou o envio agora. Chame a gente direto pelo WhatsApp.', whatsappCitmax: WHATS_CITMAX },
      { status: 502 }
    )
  }
  return NextResponse.json({ success: true, final: telefoneFinal(whatsapp) })
}
