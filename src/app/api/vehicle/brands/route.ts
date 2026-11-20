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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
