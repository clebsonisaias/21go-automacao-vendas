import { NextRequest } from 'next/server'
import { autorizarAtendai, cadastroMaisRecente, chaveTelefone, json, situacaoDoCadastro } from '@/lib/atendai'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST { telefone } → em que etapa está o cadastro mais recente desse WhatsApp.
 * O telefone vai no corpo, não na URL (URL acaba em log de acesso). A resposta
 * não traz dado pessoal: só etapa, placa, plano e links.
 */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-situacao', 120, 10 * 60 * 1000)) {
    return json({ erro: 'Muitas consultas seguidas. Tente de novo em alguns minutos.' }, 429)
  }
  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }
  const telefone = String(corpo?.telefone ?? '')
  if (!chaveTelefone(telefone)) return json({ erro: 'Telefone inválido.' }, 400)
  return json(situacaoDoCadastro(cadastroMaisRecente(telefone)))
}
