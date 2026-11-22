import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { aplicarCotacao, aplicarCupom, CupomRecusado, registrarCadastro, validarCadastro } from '@/lib/cadastro'
import { LeadSubmissionPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'quote-submit', 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const payload: LeadSubmissionPayload = await req.json()

    const invalid = validarCadastro(payload)
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 })
    }

    const recusa = aplicarCotacao(payload)
    if (recusa) {
      return NextResponse.json({ error: recusa }, { status: 400 })
    }

    // Cupom de desconto na adesão (opcional): o código vem em `cupomCodigo`.
    const recusaCupom = aplicarCupom(payload, (payload as unknown as { cupomCodigo?: unknown }).cupomCodigo, 'cadastro')
    if (recusaCupom) {
      return NextResponse.json({ error: recusaCupom, campo: 'cupom' }, { status: 400 })
    }

    const feito = await registrarCadastro(payload, { enviarWhatsApp: true, origem: 'site' })

    return NextResponse.json({
      success: true,
      leadId: feito.lead.id,
      powerCrmSuccess: feito.powerCrmSuccess,
      powerCrmQuotationCode: feito.powerCrmQuotationCode,
      checkoutUrl: feito.checkoutUrl,
      vistoriaUrl: feito.vistoriaUrl,
      message: 'Cadastro realizado! Envie os documentos para completar.',
    })
  } catch (err: any) {
    if (err instanceof CupomRecusado) {
      return NextResponse.json({ error: err.message, campo: 'cupom' }, { status: 400 })
    }
    console.error('Erro ao processar envio do lead:', err)
    return NextResponse.json(
      { error: 'Não foi possível concluir o cadastro agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
