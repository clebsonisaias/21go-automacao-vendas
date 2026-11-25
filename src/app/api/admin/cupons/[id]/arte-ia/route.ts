import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { textosDaArteComIa } from '@/lib/cupom-arte-ia'
import { lerCupons } from '@/lib/cupons'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { paraQuem } → título, destaque e subtítulo da arte do cupom escritos pela IA. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  if (!rateLimit(req, 'cupom-arte-ia', 20, 10 * 60_000)) {
    return NextResponse.json({ success: false, error: 'Muitos pedidos seguidos. Espere alguns minutos.' }, { status: 429 })
  }
  const { id } = await ctx.params
  const cupom = lerCupons().find((c) => c.id === id)
  if (!cupom) return NextResponse.json({ success: false, error: 'Cupom não encontrado.' }, { status: 404 })
  const body = await req.json().catch(() => null)
  const paraQuem = typeof body?.paraQuem === 'string' ? body.paraQuem.slice(0, 80) : ''
  const r = await textosDaArteComIa(cupom, paraQuem)
  return NextResponse.json({ success: true, ...r })
}
