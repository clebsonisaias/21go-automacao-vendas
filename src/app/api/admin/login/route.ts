import { NextRequest, NextResponse } from 'next/server'
import { getAdminPassword } from '@/lib/db'
import { createSessionToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor, informe o usuário e a senha.' },
        { status: 400 }
      )
    }

    const expectedUser = process.env.ADMIN_USER || 'admin'
    const expectedPass = getAdminPassword()

    if (username.trim() !== expectedUser || password !== expectedPass) {
      return NextResponse.json(
        { success: false, error: 'Usuário ou senha incorretos.' },
        { status: 401 }
      )
    }

    const token = createSessionToken(expectedUser, expectedPass)
    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      redirect: '/admin',
    })

    // Cookie seguro válido por 7 dias
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Erro no servidor: ${msg}` },
      { status: 500 }
    )
  }
}
