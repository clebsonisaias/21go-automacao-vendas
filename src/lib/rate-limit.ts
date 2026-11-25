// Limitador simples em memória (janela fixa) por IP. Suficiente para uma instância única;
// com várias réplicas, aplique também o limite no proxy (Traefik/Cloudflare).
const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * IP de quem chamou. O site fica atrás de um proxy só (Traefik do Coolify), que acrescenta o IP
 * real no FIM do X-Forwarded-For: o começo da lista pode ter sido escrito pelo próprio cliente
 * (forjar outro IP a cada pedido furaria os limites).
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  const ultimo = xff ? xff.split(',').map((s) => s.trim()).filter(Boolean).pop() : ''
  return (ultimo || req.headers.get('x-real-ip') || 'unknown').trim()
}

/** Retorna true se a requisição pode seguir; false se estourou o limite. */
export function rateLimit(req: Request, name: string, max: number, windowMs: number): boolean {
  return limitePorChave(name, clientIp(req), max, windowMs)
}

/**
 * O mesmo limite, por uma chave escolhida (ex.: o telefone do cliente). Para chamadas de
 * servidor a servidor, em que todos os clientes chegam do mesmo IP.
 */
export function limitePorChave(name: string, chave: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => v.resetAt <= now && buckets.delete(k))
  }
  const key = `${name}:${chave}`
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  b.count += 1
  return b.count <= max
}
