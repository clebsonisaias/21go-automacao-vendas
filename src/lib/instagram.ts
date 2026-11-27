import fs from 'fs'
import path from 'path'
import { DATA_DIR } from './db'
import { APP_BASE_URL } from './links'
import { SOCIAL_CONTENT, SOCIAL_SCHEDULE, SocialContent, contentById } from './social-content'
import { esc, sendTelegramNotification } from './telegram'
import { esperaDoProcessamento, paramsDaMidia, type Midia } from './instagram-midia'

// Publicação automática no Instagram pela API oficial da Meta (mesmo desenho do portal Macaíba Gospel):
//   POST {user}/media (image_url + caption) → aguarda status FINISHED → POST {user}/media_publish.
//
// Variáveis (Coolify): IG_USER_ID e IG_ACCESS_TOKEN (obrigatórias; sem elas nada é enviado),
// IG_API_BASE (padrão https://graph.instagram.com), IG_POST_HOUR (hora local do post diário, padrão 18).

const API = (process.env.IG_API_BASE || 'https://graph.instagram.com').replace(/\/+$/, '')
const TZ = 'America/Fortaleza'
const ART_VERSION = '1'

export interface SocialPost {
  date: string
  contentId: string
  /** Título para o painel (arte oficial do CRM, que não está no banco de posts). */
  titulo?: string
  status: 'publicado' | 'erro'
  kind?: 'feed' | 'story'
  igId?: string
  permalink?: string
  error?: string
  at: string
}

export interface SocialState {
  paused: boolean
  posts: SocialPost[]
}

const FILE = path.join(DATA_DIR, 'social.json')

export function igConfigured(): boolean {
  return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN)
}

export function postHour(): number {
  const h = Number(process.env.IG_POST_HOUR)
  return process.env.IG_POST_HOUR && Number.isInteger(h) && h >= 0 && h <= 23 ? h : 18
}

export function readState(): SocialState {
  try {
    const s = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
    return { paused: Boolean(s.paused), posts: Array.isArray(s.posts) ? s.posts : [] }
  } catch {
    return { paused: false, posts: [] }
  }
}

function writeState(s: SocialState) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ ...s, posts: s.posts.slice(0, 200) }, null, 2), 'utf-8')
  fs.renameSync(tmp, FILE)
}

export function setPaused(paused: boolean) {
  writeState({ ...readState(), paused })
}

/** Data e hora locais (Natal/RN). */
export function localNow(): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
}

/** Próximo post agendado na programação oficial (SOCIAL_SCHEDULE) que ainda não foi publicado. */
export function nextScheduledItem(state = readState()): { content: SocialContent; at: string } | null {
  const nowMs = process.env.IG_TEST_NOW ? new Date(process.env.IG_TEST_NOW).getTime() : Date.now()
  const sorted = [...SOCIAL_SCHEDULE].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  for (const item of sorted) {
    const atMs = new Date(item.at).getTime()
    // Ignora agendamentos muito antigos (> 6h atrás)
    if (atMs + 6 * 3600 * 1000 < nowMs) continue
    const already = state.posts.some((p) => p.contentId === item.contentId && (p.kind || 'feed') === 'feed' && p.status === 'publicado')
    if (already) continue
    const content = contentById(item.contentId)
    if (content) return { content, at: item.at }
  }
  return null
}

/** Próximo conteúdo: prioriza a programação oficial (Feed + Story); depois entra o rodízio diário. */
export function nextContent(state = readState()): SocialContent {
  const sched = nextScheduledItem(state)
  if (sched) return sched.content
  const last = state.posts.find((p) => p.status === 'publicado' && SOCIAL_CONTENT.some((c) => c.id === p.contentId))
  const i = last ? SOCIAL_CONTENT.findIndex((c) => c.id === last.contentId) : -1
  return SOCIAL_CONTENT[(i + 1) % SOCIAL_CONTENT.length]
}

export function artUrl(contentId: string, kind: 'feed' | 'story' = 'feed'): string {
  return `${APP_BASE_URL}/api/social/arte/${contentId}?v=${ART_VERSION}${kind === 'story' ? '&formato=story' : ''}`
}

async function ig(method: 'GET' | 'POST', pathname: string, params: Record<string, string>) {
  const url = new URL(`${API}/${pathname}`)
  const init: RequestInit = {
    method,
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` },
  }
  if (method === 'GET') Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  else init.body = new URLSearchParams(params)
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data: data as any }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let publishing = false

/** Publica um conteúdo do banco de posts. Registra o resultado e avisa no Telegram se falhar. */
export async function publishContent(contentId: string, kind: 'feed' | 'story' = 'feed'): Promise<SocialPost> {
  const content = contentById(contentId)
  if (!content) throw new Error('Conteúdo não encontrado.')
  // Post com vídeo (ex.: Reel de campanha): Reel no feed e o mesmo vídeo no story.
  if (content.video) {
    return publicarMidia({
      contentId,
      titulo: content.title,
      midia: { tipo: 'video', url: `${APP_BASE_URL}${content.video}` },
      caption: content.caption,
      kind,
    })
  }
  return publicarImagem({ contentId, titulo: content.title, imageUrl: artUrl(contentId, kind), caption: content.caption, kind })
}

/**
 * Publica uma imagem JPEG (URL pública) no feed ou no story. Usado pelo banco de posts e pelas
 * artes oficiais do CRM (crm-materiais.ts). Registra o resultado e avisa no Telegram se falhar.
 */
export async function publicarImagem(p: {
  contentId: string
  titulo: string
  imageUrl: string
  caption: string
  kind: 'feed' | 'story'
}): Promise<SocialPost> {
  return publicarMidia({ ...p, midia: { tipo: 'imagem', url: p.imageUrl } })
}

/** Publica imagem ou vídeo (URL pública que a Meta baixa) no feed (vídeo vira Reel) ou no story. */
async function publicarMidia(p: {
  contentId: string
  titulo: string
  midia: Midia
  caption: string
  kind: 'feed' | 'story'
}): Promise<SocialPost> {
  const { contentId, kind } = p
  const nome = p.midia.tipo === 'video' ? 'o vídeo' : 'a imagem'
  if (!igConfigured()) throw new Error('Instagram não configurado: defina IG_USER_ID e IG_ACCESS_TOKEN no Coolify.')
  if (publishing) throw new Error('Já existe uma publicação em andamento.')
  publishing = true

  const user = process.env.IG_USER_ID as string
  const record: SocialPost = { date: localNow().date, contentId, titulo: p.titulo, kind, status: 'erro', at: new Date().toISOString() }
  try {
    const created = await ig('POST', `${user}/media`, paramsDaMidia(p.midia, kind, p.caption))
    if (!created.ok || !created.data.id) {
      throw Object.assign(new Error(created.data?.error?.message || `A Meta recusou ${nome}.`), {
        code: created.data?.error?.code,
      })
    }

    // A Meta baixa e processa a mídia; só publica quando o status vira FINISHED (vídeo demora mais).
    const { tentativas, intervaloMs } = esperaDoProcessamento(p.midia)
    let ready = false
    for (let i = 0; i < tentativas && !ready; i++) {
      const st = await ig('GET', created.data.id, { fields: 'status_code' })
      const code = String(st.data.status_code || '')
      if (code === 'FINISHED') ready = true
      else if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`A Meta não conseguiu processar ${nome} (${code}).`)
      else await sleep(intervaloMs)
    }
    if (!ready) throw new Error(`A Meta demorou demais para processar ${nome}.`)

    const pub = await ig('POST', `${user}/media_publish`, { creation_id: created.data.id })
    if (!pub.ok || !pub.data.id) {
      throw Object.assign(new Error(pub.data?.error?.message || 'A Meta recusou a publicação.'), {
        code: pub.data?.error?.code,
      })
    }

    record.status = 'publicado'
    record.igId = pub.data.id
    const link = await ig('GET', pub.data.id, { fields: 'permalink' }).catch(() => null)
    if (link?.data?.permalink) record.permalink = link.data.permalink
  } catch (err) {
    const e = err as Error & { code?: number }
    record.error = e.message.slice(0, 300)
    console.error('[Instagram] Falha ao publicar:', record.error)
    await sendTelegramNotification(
      e.code === 190
        ? `🔑 <b>Instagram parou</b>: a chave de acesso foi recusada pela Meta (senha trocada, sessão encerrada ou chave vencida). Gere uma nova e atualize IG_ACCESS_TOKEN no Coolify.`
        : `⚠️ <b>Instagram</b>: o post "${esc(p.titulo)}" não foi publicado. Motivo: ${esc(record.error)}`
    )
  } finally {
    publishing = false
    const s = readState()
    writeState({ ...s, posts: [record, ...s.posts] })
  }
  return record
}

export interface IgMediaItem {
  id: string
  caption: string
  mediaType: string
  imageUrl?: string
  permalink?: string
  timestamp: string
  likeCount: number
  commentsCount: number
}

export interface UpcomingPost {
  id: string
  kicker: string
  title: string
  caption: string
  date: string
  scheduledAt: string
  dateLabel: string
}

let mediaCache: { at: number; items: IgMediaItem[] } | null = null

export function invalidateMediaCache() {
  mediaCache = null
}

/** Busca os posts reais já publicados em @citmax.21go (curtidas, comentários, link e miniatura). */
export async function fetchInstagramMedia(limit = 20): Promise<IgMediaItem[]> {
  if (!igConfigured()) return []
  if (mediaCache && Date.now() - mediaCache.at < 60_000) return mediaCache.items
  try {
    const userId = process.env.IG_USER_ID!
    const data = await ig('GET', `${userId}/media`, {
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: String(limit),
    })
    const rows = Array.isArray(data?.data) ? data.data : []
    const items: IgMediaItem[] = rows.map((m: Record<string, unknown>) => ({
      id: String(m.id || ''),
      caption: typeof m.caption === 'string' ? m.caption : '',
      mediaType: typeof m.media_type === 'string' ? m.media_type : 'IMAGE',
      imageUrl:
        typeof m.thumbnail_url === 'string'
          ? m.thumbnail_url
          : typeof m.media_url === 'string'
            ? m.media_url
            : undefined,
      permalink: typeof m.permalink === 'string' ? m.permalink : undefined,
      timestamp: typeof m.timestamp === 'string' ? m.timestamp : '',
      likeCount: typeof m.like_count === 'number' ? m.like_count : 0,
      commentsCount: typeof m.comments_count === 'number' ? m.comments_count : 0,
    }))
    mediaCache = { at: Date.now(), items }
    return items
  } catch (err) {
    console.warn('[Instagram] Não foi possível buscar mídias:', err instanceof Error ? err.message : err)
    return mediaCache?.items ?? []
  }
}

/** Lista dos próximos posts prontos (prioriza a programação oficial Feed + Story até 30/12; depois rodízio). */
export function upcomingSchedule(state = readState(), count = 16): UpcomingPost[] {
  const nowMs = process.env.IG_TEST_NOW ? new Date(process.env.IG_TEST_NOW).getTime() : Date.now()
  const fmtDia = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
  const fmtHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const scheduled: UpcomingPost[] = []
  const sorted = [...SOCIAL_SCHEDULE].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  for (const item of sorted) {
    const atMs = new Date(item.at).getTime()
    if (atMs + 6 * 3600 * 1000 < nowMs) continue
    const already = state.posts.some((p) => p.contentId === item.contentId && (p.kind || 'feed') === 'feed' && p.status === 'publicado')
    if (already) continue
    const content = contentById(item.contentId)
    if (!content) continue
    const dt = new Date(atMs)
    const dia = fmtDia.format(dt).replace('.', '')
    const hora = fmtHora.format(dt)
    scheduled.push({
      id: content.id,
      kicker: content.kicker,
      title: content.title,
      caption: content.caption,
      date: item.at.slice(0, 10),
      scheduledAt: item.at,
      dateLabel: `${dia} às ${hora} · Feed + Story`,
    })
  }
  if (scheduled.length > 0) return scheduled

  // Fallback após encerrar a programação datada: rodízio diário automático
  const now = localNow()
  const hour = postHour()
  const postedToday = state.posts.some(
    (p) => p.date === now.date && p.status === 'publicado' && SOCIAL_CONTENT.some((c) => c.id === p.contentId)
  )
  const startOffsetDays = postedToday || now.hour >= hour ? 1 : 0
  const last = state.posts.find((p) => p.status === 'publicado' && SOCIAL_CONTENT.some((c) => c.id === p.contentId))
  const startIdx = last ? (SOCIAL_CONTENT.findIndex((c) => c.id === last.contentId) + 1) % SOCIAL_CONTENT.length : 0
  const [y, m, d] = now.date.split('-').map(Number)
  const baseUtc = Date.UTC(y, m - 1, d, 12, 0, 0)
  const hh = String(hour).padStart(2, '0')

  const out: UpcomingPost[] = []
  for (let i = 0; i < count; i++) {
    const offset = startOffsetDays + i
    const dt = new Date(baseUtc + offset * 86_400_000)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(dt)
    const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
    const date = `${get('year')}-${get('month')}-${get('day')}`
    const content = SOCIAL_CONTENT[(startIdx + i) % SOCIAL_CONTENT.length]
    const prefix = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : fmtDia.format(dt).replace('.', '')
    const ddmm = `${get('day')}/${get('month')}`
    const dateLabel = offset <= 1 ? `${prefix}, ${ddmm} às ${hh}:00` : `${prefix} (${ddmm}) às ${hh}:00`
    out.push({
      id: content.id,
      kicker: content.kicker,
      title: content.title,
      caption: content.caption,
      date,
      scheduledAt: `${date}T${hh}:00:00-03:00`,
      dateLabel,
    })
  }
  return out
}

/** Chamado a cada poucos minutos: publica o post do dia, uma vez, a partir da hora configurada. */
/** Posts avulsos com hora marcada: saem uma vez (feed e story), até 6 h depois da hora. */
async function scheduledTick(): Promise<boolean> {
  // IG_TEST_NOW só para teste local (simula a hora); em produção fica vazio.
  const now = process.env.IG_TEST_NOW ? new Date(process.env.IG_TEST_NOW).getTime() : Date.now()
  let published = false
  for (const item of SOCIAL_SCHEDULE) {
    const at = new Date(item.at).getTime()
    if (now < at || now > at + 6 * 3600 * 1000) continue
    for (const kind of ['feed', 'story'] as const) {
      const done = readState().posts.some(
        (p) => p.contentId === item.contentId && (p.kind || 'feed') === kind && (p.status === 'publicado' || new Date(p.at).getTime() >= at)
      )
      if (!done) {
        await publishContent(item.contentId, kind)
        published = true
      }
    }
  }
  return published
}

export async function socialTick(): Promise<void> {
  if (!igConfigured()) return
  const state = readState()
  if (state.paused) return
  if (await scheduledTick()) return
  // Enquanto houver programação oficial (Seg/Qua/Sex até 30/12), não sobrepõe com o rodízio genérico.
  if (nextScheduledItem(state)) return
  const now = localNow()
  if (now.hour < postHour()) return
  // Uma tentativa por dia (com sucesso ou erro): não insiste em repetir a falha a cada ciclo.
  if (state.posts.some((p) => p.date === now.date && SOCIAL_CONTENT.some((c) => c.id === p.contentId))) return
  await publishContent(nextContent(state).id)
}
