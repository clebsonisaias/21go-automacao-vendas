import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi } from '@/lib/hinova-api'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return raw
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'cliente-login', 8, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { cpf, senha } = body

    if (!cpf || !senha) {
      return NextResponse.json(
        { success: false, error: 'Informe o CPF e a senha do associado.' },
        { status: 400 }
      )
    }

    const cleanCpf = String(cpf).replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { success: false, error: 'CPF deve conter exatamente 11 dígitos numéricos.' },
        { status: 400 }
      )
    }

    // Autenticação SEMPRE com CPF + senha no Hinova SGA. (Antes, existir no CRM bastava para entrar.)
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
      source: 'hinova',
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
