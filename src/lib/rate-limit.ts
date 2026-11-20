// Limitador simples em memória (janela fixa) por IP. Suficiente para uma instância única;
// com várias réplicas, aplique também o limite no proxy (Traefik/Cloudflare).
const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  return (xff ? xff.split(',')[0] : req.headers.get('x-real-ip') || 'unknown').trim()
}

/** Retorna true se a requisição pode seguir; false se estourou o limite. */
export function rateLimit(req: Request, name: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => v.resetAt <= now && buckets.delete(k))
  }
  const key = `${name}:${clientIp(req)}`
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  b.count += 1
  return b.count <= max
}
