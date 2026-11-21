import { NextResponse } from 'next/server'
import { getLatencyStats } from '@/lib/document-ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stats = getLatencyStats()

  return NextResponse.json({
    success: true,
    models: stats,
    timestamp: new Date().toISOString(),
  })
}
