import { NextRequest, NextResponse } from 'next/server'
import { identifyPlate } from '@/lib/powercrm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const plate = searchParams.get('plate')

  if (!plate) {
    return NextResponse.json({ error: 'Parâmetro plate é obrigatório' }, { status: 400 })
  }

  try {
    const data = await identifyPlate(plate)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao identificar placa' },
      { status: 500 }
    )
  }
}
