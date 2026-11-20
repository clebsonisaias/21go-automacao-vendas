import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'

// Protege o painel interno (/admin) e a API que entrega os cadastros dos clientes.
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

export function middleware(req: NextRequest) {
  const blocked = checkAdminAuth(req)
  if (blocked) return blocked
  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store')
  return res
}
