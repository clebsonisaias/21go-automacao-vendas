import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'

// Protege o painel interno (/admin) e a API que entrega os dados protegidos.
export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Permitir acesso livre à tela de login e à API de login
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    // Se o usuário já estiver autenticado e tentar acessar /admin/login, redireciona para /admin
    if (pathname === '/admin/login' && isRequestAuthenticated(req)) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  // Verifica se está autenticado
  const authenticated = isRequestAuthenticated(req)

  if (!authenticated) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { success: false, error: 'Autenticação necessária.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // Redireciona para /admin/login
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store')
  return res
}
