import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi } from '@/lib/hinova-api'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { cpf, senha } = body

    if (!cpf || !senha) {
      return NextResponse.json(
        { success: false, error: 'Informe o CPF e a senha do associado.' },
        { status: 400 }
      )
    }

    const cleanCpf = String(cpf).replace(/\D/g, '')
    if (cleanCpf.length !== 11 && cleanCpf !== '00000000000') {
      return NextResponse.json(
        { success: false, error: 'CPF deve conter exatamente 11 dígitos numéricos.' },
        { status: 400 }
      )
    }

    const authResult = await hinovaApi.autenticar(cleanCpf, String(senha))

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Não foi possível autenticar o associado.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      token: authResult.token,
      associado: authResult.associado,
      message: authResult.message || 'Login realizado com sucesso!',
      isMock: authResult.isMock,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/cliente/login] Erro:', message)
    return NextResponse.json(
      { success: false, error: `Erro interno no servidor: ${message}` },
      { status: 500 }
    )
  }
}
