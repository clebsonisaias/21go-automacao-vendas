import { NextRequest, NextResponse } from 'next/server'
import { calcularDesconto, conferirCupom, descreverDesconto, normalizarCodigo } from '@/lib/cupons'
import { verifyQuoteToken } from '@/lib/quote-token'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST { codigo, quoteToken, planoId } → mostra no formulário quanto o cupom tira da
 * adesão desta cotação, antes do cadastro. Só confere: quem aplica é o cadastro.
 * Não lista cupons; o limite por IP evita adivinhar códigos.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(req, 'cupom-conferir', 10, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 })
  }
  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, erro: 'Pedido inválido.' }, { status: 400 })
  }
  const codigo = normalizarCodigo(corpo?.codigo)
  if (!codigo) return NextResponse.json({ ok: false, erro: 'Digite o código do cupom.' }, { status: 400 })

  const cotacao = verifyQuoteToken(String(corpo?.quoteToken ?? ''), String(corpo?.planoId ?? '').slice(0, 40))
  if (!cotacao) {
    return NextResponse.json({ ok: false, erro: 'Sua cotação expirou. Refaça a simulação para continuar.' }, { status: 410 })
  }

  const r = conferirCupom(codigo)
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.motivo }, { status: 200 })

  const { valorDesconto, ativacaoFinal } = calcularDesconto(cotacao.plan.ativacao, r.cupom)
  return NextResponse.json({
    ok: true,
    codigo: r.cupom.codigo,
    descricao: descreverDesconto(r.cupom),
    ativacaoOriginal: cotacao.plan.ativacao,
    valorDesconto,
    ativacaoFinal,
  })
}
