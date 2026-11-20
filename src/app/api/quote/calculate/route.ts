import { NextRequest, NextResponse } from 'next/server'
import { fetchOfficialPricing } from '@/lib/powercrm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, brandId, brandText, modelId, modelText, year, codFipe, leilao, carroApp } = body

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

    return NextResponse.json(result)
  } catch (err) {
    console.error('Erro ao calcular cotação:', err)
    return NextResponse.json(
      { success: false, error: 'Não foi possível calcular a cotação agora.' },
      { status: 500 }
    )
  }
}
