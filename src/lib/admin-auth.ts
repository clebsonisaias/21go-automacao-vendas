import { NextResponse } from 'next/server'

// Autenticação do painel interno por sessão em cookie assinado (HMAC-SHA256).
// Credenciais vêm do ambiente (ADMIN_EMAIL / ADMIN_PASSWORD) e NUNCA do código-fonte.
// Compatível com o runtime Edge (middleware): usa só Web Crypto.

export const ADMIN_COOKIE = 'admin_session'
export const SESSION_MAX_AGE = 8 * 60 * 60 // 8 horas

const enc = new TextEncoder()

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
}

// Segredo de assinatura: ADMIN_SESSION_SECRET ou, na falta, a própria senha
// (trocar a senha invalida todas as sessões abertas).
function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
}

// Comparação em tempo constante para não vazar conteúdo por timing.
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

/** Confere e-mail e senha. Sempre avalia os dois campos (sem curto-circuito). */
export function verifyCredentials(email: unknown, password: unknown): boolean {
  if (!adminConfigured() || typeof email !== 'string' || typeof password !== 'string') return false
  const okEmail = safeEqual(email.trim().toLowerCase(), (process.env.ADMIN_EMAIL || '').trim().toLowerCase())
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD || '')
  return okEmail && okPass
}

function b64url(bytes: ArrayBuffer): string {
  let s = ''
  new Uint8Array(bytes).forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

/** Gera o token de sessão: "<expira-em-segundos>.<assinatura>". */
export async function createSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  return `${exp}.${await sign(`v1.${exp}`)}`
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !secret()) return false
  const dot = token.indexOf('.')
  if (dot < 1) return false
  const exp = Number(token.slice(0, dot))
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false
  return safeEqual(token.slice(dot + 1), await sign(`v1.${exp}`))
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return undefined
}

export async function hasValidSession(req: Request): Promise<boolean> {
  return verifySessionToken(readCookie(req, ADMIN_COOKIE))
}

/** Só aceita caminhos internos do painel (evita open redirect via ?next=). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login')
    ? next
    : '/admin'
}

/**
 * URL absoluta no domínio público. O Next exige URL absoluta em redirecionamentos do middleware,
 * e atrás do proxy do Coolify o host de req.url é o interno do container, não o público.
 */
export function absoluteUrl(req: Request, path: string): string {
  const url = new URL(req.url)
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host).split(',')[0].trim()
  const proto = (req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')).split(',')[0].trim()
  return `${proto === 'http' || proto === 'https' ? proto : 'https'}://${host}${path}`
}

/**
 * Devolve uma resposta de bloqueio, ou null quando há sessão válida.
 * Páginas redirecionam para o login; a API responde 401 em JSON.
 */
export async function checkAdminAuth(req: Request): Promise<NextResponse | null> {
  if (!adminConfigured()) {
    if (process.env.NODE_ENV !== 'production') return null
    return new NextResponse(
      'Painel desativado: defina ADMIN_EMAIL e ADMIN_PASSWORD no servidor para habilitar o acesso.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (await hasValidSession(req)) return null

  const { pathname, search } = new URL(req.url)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'Sessão expirada. Entre novamente.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: absoluteUrl(req, `/admin/login?next=${encodeURIComponent(pathname + search)}`),
      'Cache-Control': 'no-store',
    },
  })
}
