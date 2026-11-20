import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi } from '@/lib/hinova-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const { searchParams } = new URL(req.url)
    const cidade = searchParams.get('cidade') || undefined

    const oficinas = await hinovaApi.listarOficinas(token, cidade)

    return NextResponse.json({
      success: true,
      oficinas,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Erro ao listar oficinas: ${message}` },
      { status: 500 }
    )
  }
}
