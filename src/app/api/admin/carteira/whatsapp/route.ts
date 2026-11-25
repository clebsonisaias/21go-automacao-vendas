import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { enviarRetomada } from '@/lib/crm-carteira'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** POST { cardId, texto } → manda o WhatsApp de retomada que a equipe revisou (só no clique). */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  if (!rateLimit(req, 'carteira-whatsapp', 20, 10 * 60_000)) {
    return NextResponse.json({ success: false, error: 'Muitos envios seguidos. Espere alguns minutos.' }, { status: 429 })
  }
  const body = await req.json().catch(() => null)
  try {
    const r = await enviarRetomada(body?.cardId, body?.texto)
    if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: r.status })
    return NextResponse.json({ success: true, enviadoEm: r.enviadoEm })
  } catch (e) {
    console.error('[admin/carteira/whatsapp]', e instanceof Error ? e.message : 'erro')
    return NextResponse.json({ success: false, error: 'Não foi possível mandar agora. Tente de novo.' }, { status: 500 })
  }
}
