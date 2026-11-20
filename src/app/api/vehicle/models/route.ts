import { NextRequest, NextResponse } from 'next/server'
import { getModels } from '@/lib/powercrm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const year = searchParams.get('year')

  if (!brandId || !year) {
    return NextResponse.json(
      { error: 'Parâmetros brandId e year são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const data = await getModels(brandId, year)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
