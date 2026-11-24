import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { FONTE_TABELA, TABELAS_NORDESTE } from '@/lib/tabela-nordeste'
import { acrescentarUtilitario, lerUtilitarios, tirarUtilitario } from '@/lib/utilitarios'

export const dynamic = 'force-dynamic'

/** Arquivo da lista ilegível: erro claro, sem gravar nada por cima. */
function falhaNoArquivo(e: unknown) {
  console.error('[admin/tabela-nordeste]', e instanceof Error ? e.message : e)
  return NextResponse.json(
    { success: false, error: 'Não foi possível ler ou gravar a lista de utilitários agora. Tente de novo em instantes.' },
    { status: 500 }
  )
}

/** GET → as faixas da Tabela Nordeste e a lista de modelos que usam a tabela de utilitário. */
export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    return NextResponse.json(
      { success: true, fonte: FONTE_TABELA, tabelas: TABELAS_NORDESTE, utilitarios: lerUtilitarios() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return falhaNoArquivo(e)
  }
}

/** POST { nome } → acrescenta o modelo à lista de utilitários. */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    const body = await req.json().catch(() => null)
    const r = acrescentarUtilitario(body?.nome)
    if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: 400 })
    return NextResponse.json({ success: true, utilitarios: r.lista })
  } catch (e) {
    return falhaNoArquivo(e)
  }
}

/** DELETE ?nome= → tira o modelo da lista de utilitários. */
export async function DELETE(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    const r = tirarUtilitario(req.nextUrl.searchParams.get('nome'))
    if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: 404 })
    return NextResponse.json({ success: true, utilitarios: r.lista })
  } catch (e) {
    return falhaNoArquivo(e)
  }
}
