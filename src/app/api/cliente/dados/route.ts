import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi } from '@/lib/hinova-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de autenticação não fornecido.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    // Só dados do Hinova, validados pelo token real do associado. Nada de consulta por CPF no CRM.
    const cpf = searchParams.get('cpf') || undefined

    const dados = await hinovaApi.consultarDados(token, cpf)

    return NextResponse.json({
      success: true,
      associado: dados,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/cliente/dados] Erro:', message)
    return NextResponse.json(
      { success: false, error: `Erro ao consultar dados: ${message}` },
      { status: 500 }
    )
  }
}
