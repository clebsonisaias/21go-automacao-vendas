import { NextRequest, NextResponse } from 'next/server'
import { syncCrmLeadsToDatabase } from '@/lib/crm'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  try {
    const result = await syncCrmLeadsToDatabase()
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
