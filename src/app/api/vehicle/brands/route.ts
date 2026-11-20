import { NextRequest, NextResponse } from 'next/server'
import { getBrands } from '@/lib/powercrm'
import { VehicleType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = (searchParams.get('tipo') as VehicleType) || 'carro'

  try {
    const data = await getBrands(tipo)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Erro ao listar marcas:', err)
    return NextResponse.json({ error: 'Falha ao listar marcas' }, { status: 500 })
  }
}
