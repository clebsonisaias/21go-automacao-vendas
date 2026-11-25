import { NextRequest, NextResponse } from 'next/server'
import { fetchOfficialPricing } from '@/lib/powercrm'
import { createQuoteToken } from '@/lib/quote-token'
import { aplicarPrecoRegional, conferirVeiculo } from '@/lib/preco-regional'
import { naRegiaoDaTabela } from '@/lib/tabela-nordeste'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Cada cálculo consulta o PowerCRM: limite por IP contra robô (uma pessoa cota poucas vezes).
  if (!rateLimit(req, 'quote-calc', 30, 10 * 60 * 1000)) {
    return NextResponse.json({ success: false, error: 'Muitas cotações seguidas. Tente de novo em alguns minutos.' }, { status: 429 })
  }
  try {
    const body = await req.json()
    const { tipo, brandId, brandText, modelId, modelText, year, codFipe, leilao, carroApp, uf } = body

    if (!brandId || !modelId || !year || !codFipe) {
      return NextResponse.json(
        { error: 'Dados do veículo incompletos para cálculo' },
        { status: 400 }
      )
    }

    const result = await fetchOfficialPricing({
      tipo: tipo || 'carro',
      brandId,
      brandText: brandText || '',
      modelId,
      modelText: modelText || '',
      year,
      codFipe,
      leilao: leilao || 'nao',
      carroApp: carroApp || 'nao',
    })

    // Quem mora no RN, na PB ou no CE paga a Tabela Nordeste (ver preco-regional.ts), com o
    // veículo conferido no servidor (o nome que vem do navegador não decide a faixa).
    const veiculo = result.success && naRegiaoDaTabela(uf) ? await conferirVeiculo({ tipo, brandId, modelId, year, codFipe }) : null
    aplicarPrecoRegional(result, uf, veiculo)

    if (result.success && result.plans.length) {
      result.quoteToken = createQuoteToken(result.vehicle, result.plans, result.powercrmMeta, result.regiao?.uf) || undefined
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Erro ao calcular cotação:', err)
    return NextResponse.json(
      { success: false, error: 'Não foi possível calcular a cotação agora.' },
      { status: 500 }
    )
  }
}
