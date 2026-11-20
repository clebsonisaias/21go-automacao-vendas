import { NextRequest, NextResponse } from 'next/server'
import { absoluteUrl, checkAdminAuth, hasValidSession } from '@/lib/admin-auth'

// Protege o painel interno (/admin) e a API que entrega os cadastros dos clientes.
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

// Rotas públicas do fluxo de login/saída.
const PUBLIC = new Set(['/admin/login', '/api/admin/login', '/api/admin/logout'])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.has(pathname)) {
    // Quem já tem sessão não precisa ver o formulário de novo.
    if (pathname === '/admin/login' && (await hasValidSession(req))) {
      return new NextResponse(null, { status: 307, headers: { Location: absoluteUrl(req, '/admin') } })
    }
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store')
  return res
}
