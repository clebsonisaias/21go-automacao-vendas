import fs from 'fs'
import path from 'path'
import { DATA_DIR } from './db'
import { APP_BASE_URL } from './links'
import { SOCIAL_CONTENT, SOCIAL_SCHEDULE, SocialContent, contentById } from './social-content'
import { esc, sendTelegramNotification } from './telegram'

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

/** Próximo conteúdo do rodízio: o que vem depois do último publicado. */
export function nextContent(state = readState()): SocialContent {
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

/** Publica um conteúdo no feed. Registra o resultado e avisa no Telegram se falhar. */
export async function publishContent(contentId: string, kind: 'feed' | 'story' = 'feed'): Promise<SocialPost> {
  const content = contentById(contentId)
  if (!content) throw new Error('Conteúdo não encontrado.')
  if (!igConfigured()) throw new Error('Instagram não configurado: defina IG_USER_ID e IG_ACCESS_TOKEN no Coolify.')
  if (publishing) throw new Error('Já existe uma publicação em andamento.')
  publishing = true

  const user = process.env.IG_USER_ID as string
  const record: SocialPost = { date: localNow().date, contentId, kind, status: 'erro', at: new Date().toISOString() }
  try {
    const created = await ig(
      'POST',
      `${user}/media`,
      kind === 'story'
        ? { image_url: artUrl(contentId, 'story'), media_type: 'STORIES' }
        : { image_url: artUrl(contentId), caption: content.caption }
    )
    if (!created.ok || !created.data.id) {
      throw Object.assign(new Error(created.data?.error?.message || 'A Meta recusou a imagem.'), {
        code: created.data?.error?.code,
      })
    }

    // A Meta baixa e processa a imagem; só publica quando o status vira FINISHED.
    let ready = false
    for (let i = 0; i < 12 && !ready; i++) {
      const st = await ig('GET', created.data.id, { fields: 'status_code' })
      const code = String(st.data.status_code || '')
      if (code === 'FINISHED') ready = true
      else if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`A Meta não conseguiu processar a imagem (${code}).`)
      else await sleep(5000)
    }
    if (!ready) throw new Error('A Meta demorou demais para processar a imagem.')

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
        : `⚠️ <b>Instagram</b>: o post "${esc(content.title)}" não foi publicado. Motivo: ${esc(record.error)}`
    )
  } finally {
    publishing = false
    const s = readState()
    writeState({ ...s, posts: [record, ...s.posts] })
  }
  return record
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
  if (await scheduledTick()) return
  const state = readState()
  if (state.paused) return
  const now = localNow()
  if (now.hour < postHour()) return
  // Uma tentativa por dia (com sucesso ou erro): não insiste em repetir a falha a cada ciclo.
  if (state.posts.some((p) => p.date === now.date && SOCIAL_CONTENT.some((c) => c.id === p.contentId))) return
  await publishContent(nextContent(state).id)
}
