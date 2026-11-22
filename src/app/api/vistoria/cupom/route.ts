import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef, updateLead } from '@/lib/db'
import { calcularDesconto, descreverDesconto, liberarCupom, normalizarCodigo, reservarCupom } from '@/lib/cupons'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST { ref, codigo } → aplica o cupom de desconto na adesão de um cadastro que ainda
 * não tem cupom, pela página dos documentos. Só antes do Pix existir: depois, a ordem
 * do Mercado Pago já tem o valor e não muda. A ref (UUID) do cadastro é a credencial.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(req, 'vistoria-cupom', 10, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 })
  }
  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, erro: 'Pedido inválido.' }, { status: 400 })
  }
  const ref = String(corpo?.ref ?? '').slice(0, 80)
  const codigo = normalizarCodigo(corpo?.codigo)
  if (!codigo) return NextResponse.json({ ok: false, erro: 'Digite o código do cupom.' }, { status: 400 })

  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ ok: false, erro: 'Cadastro não encontrado. Faça uma nova cotação.' }, { status: 404 })
  if (lead.status === 'cancelado') {
    return NextResponse.json({ ok: false, erro: 'Este cadastro foi encerrado.' }, { status: 410 })
  }
  if (lead.cupom) {
    return NextResponse.json({ ok: false, erro: `Este cadastro já tem o cupom ${lead.cupom.codigo}.` }, { status: 409 })
  }
  if (lead.pagamento || lead.status === 'aprovado' || lead.status === 'adesao_paga') {
    return NextResponse.json(
      { ok: false, erro: 'O Pix da adesão já foi gerado; o cupom não pode mais ser aplicado.' },
      { status: 409 }
    )
  }

  const r = reservarCupom(codigo, lead.ref)
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.motivo }, { status: 200 })

  const { valorDesconto, ativacaoFinal } = calcularDesconto(lead.ativacao, r.cupom)
  const original = lead.ativacao
  let aplicado = false
  const atualizado = updateLead(lead.ref, (l) => {
    // Confere de novo dentro da gravação: dois cliques seguidos não aplicam duas vezes.
    if (l.cupom || l.pagamento) return
    l.ativacaoOriginal = l.ativacao
    l.ativacao = ativacaoFinal
    l.cupom = {
      codigo: r.cupom.codigo,
      tipo: r.cupom.tipo,
      desconto: r.cupom.desconto,
      valorDesconto,
      aplicadoEm: new Date().toISOString(),
      origem: 'documentos',
    }
    aplicado = true
  })
  if (!atualizado || !aplicado) {
    if (!atualizado?.cupom || atualizado.cupom.codigo !== r.cupom.codigo) liberarCupom(r.cupom.codigo, lead.ref)
    return NextResponse.json({ ok: false, erro: 'Não foi possível aplicar o cupom agora. Atualize a página.' }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    codigo: r.cupom.codigo,
    descricao: descreverDesconto(r.cupom),
    ativacaoOriginal: original,
    valorDesconto,
    ativacaoFinal,
  })
}
