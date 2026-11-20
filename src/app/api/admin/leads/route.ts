import { NextResponse } from 'next/server'
import { getStoredLeads } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const leads = getStoredLeads()
    return NextResponse.json({ success: true, leads })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
