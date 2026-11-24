import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { decidirRegiao } from '@/lib/regiao-comprovante'

export const dynamic = 'force-dynamic'

/**
 * POST { ref, decisao: 'regional' | 'nacional' } → a equipe decide o preço quando o comprovante
 * não confirmou o estado sozinho (CEP ilegível, estado e CEP diferentes, plano que não é o da
 * tabela). Só antes do Pix. Cliente e equipe são avisados se o preço mudar.
 */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const body = await req.json().catch(() => ({}))
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
  const decisao = body?.decisao === 'regional' || body?.decisao === 'nacional' ? body.decisao : null
  if (!ref || !decisao) return NextResponse.json({ success: false, error: 'Pedido inválido.' }, { status: 400 })
  const r = await decidirRegiao(ref, decisao)
  if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: 409 })
  return NextResponse.json({
    success: true,
    lead: r.lead,
    message: decisao === 'regional' ? 'Tabela regional confirmada. O Pix sai quando a vistoria for aprovada.' : 'Preço nacional aplicado.',
  })
}
