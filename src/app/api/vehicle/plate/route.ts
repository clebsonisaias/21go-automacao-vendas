import { NextRequest, NextResponse } from 'next/server'
import { identifyPlate } from '@/lib/powercrm'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const plate = searchParams.get('plate')

  if (!rateLimit(req, 'plate', 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas consultas. Aguarde um minuto.' }, { status: 429 })
  }

  if (!plate) {
    return NextResponse.json({ error: 'Parâmetro plate é obrigatório' }, { status: 400 })
  }

  try {
    const data = await identifyPlate(plate)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Erro ao identificar placa:', err)
    return NextResponse.json({ error: 'Não foi possível consultar a placa agora.' }, { status: 500 })
  }
}
