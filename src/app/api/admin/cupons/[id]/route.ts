import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { atualizarCupom, excluirCupom, lerCupons, ligarCupom, validarDadosCupom } from '@/lib/cupons'

export const dynamic = 'force-dynamic'

const paraPainel = () => lerCupons().map(({ leads: _leads, ...c }) => c)

/** PATCH { ativo } liga ou desliga; PATCH com os dados completos edita. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (body && typeof body.ativo === 'boolean' && Object.keys(body).length === 1) {
    if (!ligarCupom(id, body.ativo)) return NextResponse.json({ success: false, error: 'Cupom não encontrado.' }, { status: 404 })
    return NextResponse.json({ success: true, cupons: paraPainel() })
  }
  const v = validarDadosCupom(body)
  if (!v.ok) return NextResponse.json({ success: false, error: v.erro }, { status: 400 })
  const r = atualizarCupom(id, v.dados)
  if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: r.status })
  return NextResponse.json({ success: true, cupons: paraPainel() })
}

/** Só apaga cupom nunca usado. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const { id } = await params
  const r = excluirCupom(id)
  if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: r.status })
  return NextResponse.json({ success: true, cupons: paraPainel() })
}
