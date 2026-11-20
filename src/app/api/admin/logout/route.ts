import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout realizado com sucesso!',
    redirect: '/admin/login',
  })

  response.cookies.set({
    name: 'admin_session',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  })

  return response
}
