import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { buscarCarteira } from '@/lib/crm-carteira'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** GET /api/admin/carteira[?atualizar=1] → números do CRM e cotações paradas (aba Carteira). */
export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  // "Atualizar agora" passa por cima do cache de 5 minutos, com limite para não martelar o CRM.
  const atualizar = req.nextUrl.searchParams.get('atualizar') === '1' && rateLimit(req, 'carteira-atualizar', 10, 10 * 60_000)
  try {
    const dados = await buscarCarteira({ atualizar })
    if (!dados) {
      return NextResponse.json(
        { success: false, error: 'O CRM 21Go não respondeu. Tente de novo em instantes.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    return NextResponse.json({ success: true, dados }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[admin/carteira]', e instanceof Error ? e.message : 'erro')
    return NextResponse.json({ success: false, error: 'Não foi possível montar a carteira agora.' }, { status: 500 })
  }
}
