import { NextRequest } from 'next/server'
import { autorizarAtendai, json } from '@/lib/atendai'
import { cotacaoDoChat, limparPlaca, PLACA } from '@/lib/atendai-cotacao'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST { placa, usoApp?, leilao?, modelo? } → a mesma cotação do site (placa →
 * veículo → planos), guardada aqui com um número curto para o chat contratar.
 * Placa com mais de um modelo devolve as opções (`escolherModelo`).
 */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-cotacao', 60, 10 * 60 * 1000)) {
    return json({ erro: 'Muitas cotações seguidas. Tente de novo em alguns minutos.' }, 429)
  }

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }
  const placa = limparPlaca(corpo?.placa)
  if (!PLACA.test(placa)) {
    return json({ erro: 'Placa inválida. Informe os 7 caracteres (ex.: ABC1D23).' }, 400)
  }
  const r = await cotacaoDoChat({
    placa,
    usoApp: corpo?.usoApp === true,
    leilao: corpo?.leilao === true,
    modelo: typeof corpo?.modelo === 'string' ? corpo.modelo.trim().slice(0, 40) : '',
  })
  return json(r.corpo, r.status)
}
