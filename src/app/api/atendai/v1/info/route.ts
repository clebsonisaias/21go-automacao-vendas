import { NextRequest } from 'next/server'
import { autorizarAtendai, json } from '@/lib/atendai'

export const dynamic = 'force-dynamic'

/** O AtendeHub chama no "Testar a API": o que este site oferece pelo chat. */
export async function GET(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  return json({ nome: '21Go', recursos: ['cotacao', 'contratacao', 'situacao'] })
}
