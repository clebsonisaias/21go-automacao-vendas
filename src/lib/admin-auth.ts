import { NextResponse } from 'next/server'

// Autenticação do painel interno 21Go.
// Sessão: cookie assinado com HMAC-SHA256 (nunca contém a senha). Também aceita HTTP Basic.
// Usa Web Crypto (crypto.subtle), disponível tanto no runtime Edge (middleware) quanto no Node.
//
// Variáveis: ADMIN_USER (padrão "admin"), ADMIN_PASSWORD (obrigatória) e SESSION_SECRET
// (recomendada; se ausente, deriva da ADMIN_PASSWORD). Sem ADMIN_PASSWORD o painel fica bloqueado.

export const SESSION_COOKIE = 'admin_session'
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7

const enc = new TextEncoder()

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function adminUser(): string {
  return process.env.ADMIN_USER || 'admin'
}

/** Senha do painel vinda do ambiente. Vazia = painel bloqueado (não existe senha padrão). */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || ''
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || adminPassword()
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))))
}

/** Confere usuário e senha informados contra o ambiente (tempo constante). */
export function credentialsMatch(user: string, pass: string): boolean {
  const expected = adminPassword()
  if (!expected) return false
  return safeEqual(user, adminUser()) && safeEqual(pass, expected)
}

export async function createSessionToken(user: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ u: user, exp: Date.now() + SESSION_MAX_AGE_S * 1000 })))
  return `${payload}.${await hmac(payload)}`
}

export async function isValidSessionToken(token: string): Promise<boolean> {
  try {
    if (!adminPassword()) return false
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return false
    if (!safeEqual(sig, await hmac(payload))) return false
    const data = JSON.parse(b64urlDecode(payload)) as { u?: string; exp?: number }
    return safeEqual(data.u || '', adminUser()) && typeof data.exp === 'number' && data.exp > Date.now()
  } catch {
    return false
  }
}

/** Verifica se a requisição está autenticada via cookie assinado ou Basic Auth. */
export async function isRequestAuthenticated(req: Request): Promise<boolean> {
  if (!adminPassword()) return false

  const cookieHeader = req.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...v] = c.trim().split('=')
      return [key, decodeURIComponent(v.join('='))]
    })
  )
  if (cookies[SESSION_COOKIE] && (await isValidSessionToken(cookies[SESSION_COOKIE]))) {
    return true
  }

  const header = req.headers.get('authorization') || ''
  if (header.startsWith('Basic ')) {
    try {
      const bytes = Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0))
      const decoded = new TextDecoder().decode(bytes)
      const sep = decoded.indexOf(':')
      if (sep >= 0 && credentialsMatch(decoded.slice(0, sep), decoded.slice(sep + 1))) {
        return true
      }
    } catch {}
  }

  return false
}

/** Devolve uma resposta de bloqueio, ou null quando o acesso está autorizado. */
export async function checkAdminAuth(req: Request): Promise<NextResponse | null> {
  if (await isRequestAuthenticated(req)) {
    return null
  }

  const url = new URL(req.url)

  if (url.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'Autenticação necessária.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.redirect(new URL('/admin/login', req.url))
}
