import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getStoredLeads } from '@/lib/db'
import { pendenciasDosLeads } from '@/lib/pendencias'
import { telegramConfigurado } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/** GET → o que a equipe precisa fazer (cadastros do site parados num passo da equipe). */
export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    return NextResponse.json(
      { success: true, pendencias: pendenciasDosLeads(getStoredLeads(), Date.now()), telegramLigado: telegramConfigurado() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[admin/pendencias]', e instanceof Error ? e.message : 'erro')
    return NextResponse.json({ success: false, error: 'Não foi possível ler os cadastros agora.' }, { status: 500 })
  }
}
