import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { tokenValido } from '@/lib/cotacao-whatsapp'
import { acharPorToken, marcarAberta } from '@/lib/cotacao-whatsapp-envio'

export const dynamic = 'force-dynamic'

/**
 * POST { token } → os dados para refazer a cotação do link do WhatsApp (`/?cotacao=`). O token vai
 * no corpo, não na URL da API (fica fora do log de acesso). A resposta não traz o telefone.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(req, 'cotacao-retomar', 30, 10 * 60 * 1000)) {
    return NextResponse.json({ success: false, error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 })
  }
  const b = await req.json().catch(() => null)
  const token = b?.token
  const c = tokenValido(token) ? acharPorToken(token) : null
  if (!c) {
    return NextResponse.json(
      { success: false, error: 'Este link de cotação venceu. Faça a cotação de novo pela placa.' },
      { status: 404 }
    )
  }
  marcarAberta(c.id)
  return NextResponse.json(
    {
      success: true,
      pedido: c.pedido,
      placa: c.placa || '',
      uf: c.uf || '',
      cupom: c.cupom || '',
      origem: c.origem || null,
      plano: { id: c.plano.id, mensalidade: c.plano.mensalidade },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
