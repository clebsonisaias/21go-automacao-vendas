import { NextRequest, NextResponse } from 'next/server'
import { getStoredLeads } from '@/lib/db'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Defesa em profundidade: a rota se protege mesmo que o middleware seja ignorado.
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  try {
    const leads = getStoredLeads()
    return NextResponse.json({ success: true, leads }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('Erro ao listar leads:', err)
    return NextResponse.json({ success: false, error: 'Erro ao carregar cadastros.' }, { status: 500 })
  }
}
