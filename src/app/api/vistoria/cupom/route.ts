import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef, updateLead } from '@/lib/db'
import { calcularDesconto, conferirCupom, cupomAindaCabe, descreverDesconto, liberarCupom, normalizarCodigo, reservarCupom } from '@/lib/cupons'
import { PROMO_ADESAO } from '@/lib/promo-adesao'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Ainda aceita cupom? A Black 21Go (aplicada sozinha no cadastro) não conta como cupom aqui. */
const cabeCupom = (l: Parameters<typeof cupomAindaCabe>[0] & { cupom?: { codigo?: string } }) =>
  cupomAindaCabe({ ...l, cupom: l.cupom?.codigo === PROMO_ADESAO.codigo ? undefined : l.cupom })

/**
 * POST { ref, codigo } → aplica o cupom de desconto na adesão de um cadastro que ainda
 * não tem cupom, pela página dos documentos. Só antes da aprovação da vistoria: é ela que
 * libera o Pix (com o valor da adesão nas mensagens) ou, com adesão zerada, dá como paga.
 * A ref (UUID) do cadastro é a credencial.
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
  // Cadastro feito na Black 21Go (adesão por R$ 1, sem cupom): um cupom que deixa a adesão ainda
  // menor (o de parceiro que dá adesão grátis) troca a Black; o desconto é sobre a adesão cheia.
  const naBlack = lead.cupom?.codigo === PROMO_ADESAO.codigo
  if (lead.cupom && !naBlack) {
    return NextResponse.json({ ok: false, erro: `Este cadastro já tem o cupom ${lead.cupom.codigo}.` }, { status: 409 })
  }
  const base = naBlack ? (lead.ativacaoOriginal ?? lead.ativacao) : lead.ativacao
  if (naBlack) {
    const c = conferirCupom(codigo)
    if (!c.ok) return NextResponse.json({ ok: false, erro: c.motivo }, { status: 200 })
    if (calcularDesconto(base, c.cupom).ativacaoFinal >= lead.ativacao) {
      return NextResponse.json(
        { ok: false, erro: `Na Black 21Go a sua adesão já está em R$ 1,00, menor que com o cupom ${c.cupom.codigo}.` },
        { status: 200 }
      )
    }
  }
  if (!cabeCupom(lead)) {
    return NextResponse.json(
      { ok: false, erro: 'O cupom só pode ser aplicado antes da aprovação da vistoria.' },
      { status: 409 }
    )
  }

  const r = reservarCupom(codigo, lead.ref)
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.motivo }, { status: 200 })

  const { valorDesconto, ativacaoFinal } = calcularDesconto(base, r.cupom)
  const original = base
  let aplicado = false
  const atualizado = updateLead(lead.ref, (l) => {
    // Confere de novo dentro da gravação: dois cliques seguidos não aplicam duas vezes.
    if (!cabeCupom(l)) return
    if (l.cupom && l.cupom.codigo !== PROMO_ADESAO.codigo) return
    l.ativacaoOriginal = base
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
