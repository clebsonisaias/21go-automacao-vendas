import { NextRequest } from 'next/server'
import { autorizarAtendai, chaveTelefone, json } from '@/lib/atendai'
import { rateLimit } from '@/lib/rate-limit'
import { pararLembretes } from '@/lib/cotacao-whatsapp-envio'

export const dynamic = 'force-dynamic'

/** POST { telefone } → a pessoa pediu no chat para não receber mais lembretes da cotação do site. */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-cotacao-parar', 120, 10 * 60 * 1000)) {
    return json({ erro: 'Muitas consultas seguidas. Tente de novo em alguns minutos.' }, 429)
  }
  const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const telefone = String(corpo?.telefone ?? '')
  if (!chaveTelefone(telefone)) return json({ erro: 'Telefone inválido.' }, 400)
  return json({ paradas: pararLembretes({ telefone }, 'cliente') })
}
