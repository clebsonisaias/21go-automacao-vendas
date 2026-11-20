import { NextResponse } from 'next/server'

// Autenticação do painel interno 21Go.
// Suporta Cookie de Sessão (admin_session) e Header HTTP Basic para compatibilidade.

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function createSessionToken(user: string, pass: string): string {
  if (typeof btoa === 'function') {
    return btoa(`${user}:::${pass}`)
  }
  return Buffer.from(`${user}:::${pass}`).toString('base64')
}

export function isValidSessionToken(token: string): boolean {
  try {
    const decoded = typeof atob === 'function' ? atob(token) : Buffer.from(token, 'base64').toString('utf-8')
    const [u, p] = decoded.split(':::')
    const user = process.env.ADMIN_USER || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'Gael@1'
    return safeEqual(u || '', user) && safeEqual(p || '', password)
  } catch {
    return false
  }
}

/** Verifica se a requisição está autenticada via Cookie ou Basic Auth */
export function isRequestAuthenticated(req: Request): boolean {
  // 1. Checa Cookie admin_session
  const cookieHeader = req.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...v] = c.trim().split('=')
      return [key, decodeURIComponent(v.join('='))]
    })
  )

  if (cookies.admin_session && isValidSessionToken(cookies.admin_session)) {
    return true
  }

  // 2. Checa HTTP Basic Auth
  const header = req.headers.get('authorization') || ''
  if (header.startsWith('Basic ')) {
    try {
      const bytes = Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0))
      const decoded = new TextDecoder().decode(bytes)
      const sep = decoded.indexOf(':')
      if (sep >= 0) {
        const u = decoded.slice(0, sep)
        const p = decoded.slice(sep + 1)
        const user = process.env.ADMIN_USER || 'admin'
        const password = process.env.ADMIN_PASSWORD || 'Gael@1'
        if (safeEqual(u, user) && safeEqual(p, password)) {
          return true
        }
      }
    } catch {}
  }

  return false
}

/** Devolve uma resposta de bloqueio, ou null quando o acesso está autorizado. */
export function checkAdminAuth(req: Request): NextResponse | null {
  if (isRequestAuthenticated(req)) {
    return null
  }

  // Se não autenticado:
  const url = new URL(req.url)

  // Se for rota de API, devolve JSON 401
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'Autenticação necessária.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Se for página web, redireciona para a tela de login
  return NextResponse.redirect(new URL('/admin/login', req.url))
}
