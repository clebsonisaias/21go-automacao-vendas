import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import {
  fetchInstagramMedia,
  igConfigured,
  invalidateMediaCache,
  nextContent,
  postHour,
  publishContent,
  readState,
  setPaused,
  upcomingSchedule,
} from '@/lib/instagram'
import { SOCIAL_CONTENT } from '@/lib/social-content'

export const dynamic = 'force-dynamic'

async function snapshot() {
  const state = readState()
  const next = nextContent(state)
  const igPosts = await fetchInstagramMedia(20)
  const upcoming = upcomingSchedule(state, SOCIAL_CONTENT.length)
  return {
    success: true,
    configured: igConfigured(),
    paused: state.paused,
    hour: postHour(),
    next: { id: next.id, title: next.title, caption: next.caption },
    total: SOCIAL_CONTENT.length,
    upcoming,
    igPosts,
    posts: state.posts.slice(0, 30).map((p) => ({
      ...p,
      title: SOCIAL_CONTENT.find((c) => c.id === p.contentId)?.title || p.titulo || p.contentId,
    })),
  }
}

export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  if (req.nextUrl.searchParams.get('refresh') === '1') invalidateMediaCache()
  return NextResponse.json(await snapshot(), { headers: { 'Cache-Control': 'no-store' } })
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
      const target = nextContent()
      const r = await publishContent(target.id, 'feed')
      if (r.status === 'publicado' && target.oneOff) {
        await publishContent(target.id, 'story').catch(() => undefined)
      }
      invalidateMediaCache()
      if (r.status !== 'publicado') {
        return NextResponse.json({ ...(await snapshot()), success: false, error: r.error }, { status: 502 })
      }
    } else {
      return NextResponse.json({ success: false, error: 'Ação inválida.' }, { status: 400 })
    }
    return NextResponse.json(await snapshot())
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro.' }, { status: 409 })
  }
}
