import { NextRequest, NextResponse } from 'next/server'

// Protege o painel interno (/admin) e a API que entrega os cadastros dos clientes.
// Autenticação HTTP Basic: usuário ADMIN_USER (padrão "admin") e senha ADMIN_PASSWORD.
// Em produção, sem ADMIN_PASSWORD configurada o painel fica bloqueado (falha fechada).
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

// Comparação em tempo constante para não vazar o tamanho/conteúdo da senha por timing.
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function unauthorized() {
  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Painel da franquia 21Go", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD || ''
  const user = process.env.ADMIN_USER || 'admin'

  if (!password) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.next()
    return new NextResponse(
      'Painel desativado: defina a variável ADMIN_PASSWORD no servidor para habilitar o acesso.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return unauthorized()

  let decoded = ''
  try {
    const bytes = Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0))
    decoded = new TextDecoder().decode(bytes)
  } catch {
    return unauthorized()
  }

  const sep = decoded.indexOf(':')
  if (sep < 0) return unauthorized()

  const okUser = safeEqual(decoded.slice(0, sep), user)
  const okPass = safeEqual(decoded.slice(sep + 1), password)
  if (!(okUser && okPass)) return unauthorized()

  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store')
  return res
}
