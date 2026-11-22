import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { criarCupom, lerCupons, validarDadosCupom } from '@/lib/cupons'
import { mpEnabled } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

/** Arquivo de cupons ilegível: erro claro, sem gravar nada por cima. */
function falhaNoArquivo(e: unknown) {
  console.error('[admin/cupons]', e instanceof Error ? e.message : e)
  return NextResponse.json({ success: false, error: 'Não foi possível ler ou gravar os cupons agora. Tente de novo em instantes.' }, { status: 500 })
}

/** O painel não precisa da lista de cadastros que usaram cada cupom, só a contagem. */
function paraPainel() {
  return lerCupons().map(({ leads: _leads, ...c }) => c)
}

export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    return NextResponse.json(
      { success: true, cupons: paraPainel(), pixLigado: mpEnabled() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return falhaNoArquivo(e)
  }
}

/** POST { codigo, descricao?, tipo, desconto, inicio?, fim?, maxUsos?, ativo? } → cria o cupom. */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    const body = await req.json().catch(() => null)
    const v = validarDadosCupom(body)
    if (!v.ok) return NextResponse.json({ success: false, error: v.erro }, { status: 400 })
    const r = criarCupom(v.dados)
    if (!r.ok) return NextResponse.json({ success: false, error: r.erro }, { status: 409 })
    return NextResponse.json({ success: true, cupons: paraPainel() })
  } catch (e) {
    return falhaNoArquivo(e)
  }
}
