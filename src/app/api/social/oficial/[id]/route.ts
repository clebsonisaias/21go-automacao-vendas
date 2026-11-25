import fs from 'fs'
import { caminhoDoJpg } from '@/lib/crm-materiais'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Arte oficial já convertida para JPEG (ver crm-materiais.ts). Pública: a Meta baixa por URL.
 * Só existe depois que alguém da equipe mandou publicar aquela arte pelo /admin.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const arquivo = caminhoDoJpg(id)
  if (!arquivo || !fs.existsSync(arquivo)) return new Response('Não encontrado', { status: 404 })
  const jpg = fs.readFileSync(arquivo)
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
  })
}
