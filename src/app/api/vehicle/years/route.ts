import { NextResponse } from 'next/server'
import { getYears } from '@/lib/powercrm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getYears()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Erro ao listar anos:', err)
    return NextResponse.json({ error: 'Falha ao listar anos' }, { status: 500 })
  }
}
