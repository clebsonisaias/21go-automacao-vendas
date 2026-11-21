import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { igConfigured, nextContent, postHour, publishContent, readState, setPaused } from '@/lib/instagram'
import { SOCIAL_CONTENT } from '@/lib/social-content'

export const dynamic = 'force-dynamic'

function snapshot() {
  const state = readState()
  const next = nextContent(state)
  return {
    success: true,
    configured: igConfigured(),
    paused: state.paused,
    hour: postHour(),
    next: { id: next.id, title: next.title, caption: next.caption },
    total: SOCIAL_CONTENT.length,
    posts: state.posts.slice(0, 30).map((p) => ({
      ...p,
      title: SOCIAL_CONTENT.find((c) => c.id === p.contentId)?.title || p.contentId,
    })),
  }
}

export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  return NextResponse.json(snapshot(), { headers: { 'Cache-Control': 'no-store' } })
}

/** POST { action: 'pause' | 'resume' | 'publish' } */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const body = await req.json().catch(() => ({}))
  try {
    if (body?.action === 'pause') setPaused(true)
    else if (body?.action === 'resume') setPaused(false)
    else if (body?.action === 'publish') {
      const r = await publishContent(nextContent().id)
      if (r.status !== 'publicado') {
        return NextResponse.json({ ...snapshot(), success: false, error: r.error }, { status: 502 })
      }
    } else {
      return NextResponse.json({ success: false, error: 'Ação inválida.' }, { status: 400 })
    }
    return NextResponse.json(snapshot())
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro.' }, { status: 409 })
  }
}
