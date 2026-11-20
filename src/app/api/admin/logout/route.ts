import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return res
}
