import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef } from '@/lib/db'
import { cupomAindaCabe } from '@/lib/cupons'
import { PROMO_ADESAO } from '@/lib/promo-adesao'
import { mpEnabled } from '@/lib/mercadopago'
import { pagamentoPath } from '@/lib/links'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET ?ref= → em que passo o cliente está, para a tela do site se atualizar sozinha.
 * A ref (UUID) é a credencial; não devolve dado pessoal, só links e situação.
 */
export async function GET(req: NextRequest) {
  if (!rateLimit(req, 'vistoria-situacao', 120, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas consultas.' }, { status: 429 })
  }
  const ref = (req.nextUrl.searchParams.get('ref') || '').slice(0, 80)
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const pago = Boolean(lead.pagamento?.paidAt)
  const pixLiberado = !pago && (lead.status === 'aguardando_pagamento' || Boolean(lead.pagamento))

  return NextResponse.json(
    {
      documentos: Boolean(lead.vistoriaData),
      documentosEm: lead.vistoriaData?.enviadoEm || null,
      appVistoUrl: lead.appVistoUrl || null,
      vistoriaStatus: lead.crmVistoria?.vistoriaStatus || null,
      pagamentoUrl: pixLiberado ? pagamentoPath(lead.ref) : null,
      pago,
      // Cupom de desconto na adesão: pode ser aplicado até o Pix ser gerado.
      ativacao: lead.ativacao,
      ativacaoOriginal: lead.ativacaoOriginal ?? null,
      // A Black 21Go (adesão por R$ 1, aplicada sozinha no cadastro) não é cupom: um cupom que
      // deixe a adesão ainda menor pode ser aplicado por cima (api/vistoria/cupom).
      cupom: lead.cupom && lead.cupom.codigo !== PROMO_ADESAO.codigo ? lead.cupom.codigo : null,
      black: lead.cupom?.codigo === PROMO_ADESAO.codigo,
      // Sem o Pix do site os cupons ficam desligados (o checkout do PowerCRM não os conhece).
      podeAplicarCupom:
        mpEnabled() && cupomAindaCabe({ ...lead, cupom: lead.cupom?.codigo === PROMO_ADESAO.codigo ? undefined : lead.cupom }),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
