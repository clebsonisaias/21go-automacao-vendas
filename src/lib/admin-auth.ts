import { NextResponse } from 'next/server'

// Autenticação HTTP Basic do painel interno. Usada no middleware e, como defesa em
// profundidade, dentro das próprias rotas /api/admin (se um bypass de middleware
// aparecer no framework, a API continua protegida).

// Comparação em tempo constante para não vazar o tamanho/conteúdo da senha por timing.
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function unauthorized() {
  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Painel da franquia 21Go", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

/** Devolve uma resposta de bloqueio, ou null quando o acesso está autorizado. */
export function checkAdminAuth(req: Request): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD || 'Gael@1'
  const user = process.env.ADMIN_USER || 'admin'

  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return unauthorized()

  let decoded = ''
  try {
    const bytes = Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0))
    decoded = new TextDecoder().decode(bytes)
  } catch {
    return unauthorized()
  }

  const sep = decoded.indexOf(':')
  if (sep < 0) return unauthorized()

  const okUser = safeEqual(decoded.slice(0, sep), user)
  const okPass = safeEqual(decoded.slice(sep + 1), password)
  return okUser && okPass ? null : unauthorized()
}
