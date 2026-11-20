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

  if (!/^[\w-]{1,20}$/.test(brandId) || !/^[\w-]{1,20}$/.test(year)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  try {
    const data = await getModels(brandId, year)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Erro ao listar modelos:', err)
    return NextResponse.json({ error: 'Falha ao listar modelos' }, { status: 500 })
  }
}
