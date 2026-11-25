import { NextRequest } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { previaDaArte } from '@/lib/crm-materiais'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?tam=1080 → prévia da arte oficial em JPEG (400 px por padrão). Só para o admin. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const { id } = await ctx.params
  const jpg = await previaDaArte(id, req.nextUrl.searchParams.get('tam') === '1080' ? 1080 : 400)
  if (!jpg) return new Response('Prévia indisponível', { status: 404 })
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  })
}
