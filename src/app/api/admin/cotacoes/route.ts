import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { cotacoesParaEquipe, mensagemSugerida } from '@/lib/cotacao-whatsapp'
import { lerCotacoesWhatsApp, mensagemDaEquipe, pararLembretes } from '@/lib/cotacao-whatsapp-envio'

export const dynamic = 'force-dynamic'

/** GET → quadro "Cotou e não fechou" (telefone só com os 4 últimos dígitos, sem o link). */
export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  try {
    const lista = lerCotacoesWhatsApp()
    const itens = cotacoesParaEquipe(lista, Date.now()).map((i) => {
      const c = lista.find((x) => x.id === i.id)!
      return { ...i, sugestao: mensagemSugerida(c) }
    })
    return NextResponse.json({ success: true, cotacoes: itens }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[admin/cotacoes]', e instanceof Error ? e.message : 'erro')
    return NextResponse.json({ success: false, error: 'Não foi possível ler as cotações agora.' }, { status: 500 })
  }
}

/** POST { id, acao: 'parar' } ou { id, acao: 'mensagem', texto } */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id : ''
  if (!id) return NextResponse.json({ success: false, error: 'Cotação não encontrada.' }, { status: 404 })
  if (b.acao === 'parar') {
    const n = pararLembretes({ id }, 'equipe')
    return n
      ? NextResponse.json({ success: true })
      : NextResponse.json({ success: false, error: 'Esta cotação já não recebe lembretes.' }, { status: 409 })
  }
  if (b.acao === 'mensagem') {
    const r = await mensagemDaEquipe(id, typeof b.texto === 'string' ? b.texto : '')
    return r.ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: r.erro }, { status: 400 })
  }
  return NextResponse.json({ success: false, error: 'Ação desconhecida.' }, { status: 400 })
}
