import { NextRequest, NextResponse } from 'next/server'
import { fetchOfficialPricing } from '@/lib/powercrm'
import { createQuoteToken } from '@/lib/quote-token'
import { aplicarPrecoRegional } from '@/lib/preco-regional'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
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

    // Quem mora no Nordeste paga a Tabela Nordeste (ver preco-regional.ts).
    aplicarPrecoRegional(result, uf, tipo === 'moto' ? 'moto' : 'carro')

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
