import { NextRequest, NextResponse } from 'next/server'
import { adminPassword, createSessionToken, credentialsMatch, SESSION_COOKIE, SESSION_MAX_AGE_S } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Freia tentativa de adivinhar a senha.
    if (!rateLimit(req, 'admin-login', 8, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    if (!adminPassword()) {
      return NextResponse.json(
        { success: false, error: 'Painel bloqueado: defina a variável ADMIN_PASSWORD no servidor.' },
        { status: 503 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor, informe o usuário e a senha.' },
        { status: 400 }
      )
    }

    if (!credentialsMatch(username, password)) {
      return NextResponse.json(
        { success: false, error: 'Usuário ou senha incorretos.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      redirect: '/admin',
    })

    response.cookies.set({
      name: SESSION_COOKIE,
      value: await createSessionToken(username),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_S,
    })

    return response
  } catch (err) {
    console.error('Erro no login admin:', err)
    return NextResponse.json({ success: false, error: 'Erro no servidor.' }, { status: 500 })
  }
}
