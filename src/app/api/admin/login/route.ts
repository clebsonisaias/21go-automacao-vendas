import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  adminConfigured,
  createSessionToken,
  verifyCredentials,
} from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  // Freia tentativa de adivinhar a senha: 8 tentativas por IP a cada 15 minutos.
  if (!rateLimit(req, 'admin-login', 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' },
      { status: 429, headers: noStore }
    )
  }

  if (!adminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Acesso ao painel ainda não configurado no servidor.' },
      { status: 503, headers: noStore }
    )
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    // corpo inválido cai na rejeição abaixo
  }

  if (!verifyCredentials(body?.email, body?.password)) {
    await new Promise((r) => setTimeout(r, 500)) // desacelera força bruta
    return NextResponse.json(
      { success: false, error: 'E-mail ou senha incorretos.' },
      { status: 401, headers: noStore }
    )
  }

  const res = NextResponse.json({ success: true }, { headers: noStore })
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
