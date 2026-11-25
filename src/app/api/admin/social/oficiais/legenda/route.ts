import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { escreverLegendaDaArte } from '@/lib/legenda-ia'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { arteId } → legenda sugerida pela IA para a arte oficial, com os alertas. Nada é publicado. */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  if (!rateLimit(req, 'artes-oficiais-legenda', 20, 10 * 60_000)) {
    return NextResponse.json({ success: false, error: 'Muitos pedidos seguidos. Espere alguns minutos.' }, { status: 429 })
  }
  const body = await req.json().catch(() => null)
  const arteId = typeof body?.arteId === 'string' ? body.arteId : ''
  const r = await escreverLegendaDaArte(arteId)
  if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: r.status })
  return NextResponse.json({ success: true, texto: r.texto, legenda: r.legenda, alertas: r.alertas })
}
