import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef, LeadPagamento } from '@/lib/db'
import { mpEnabled } from '@/lib/mercadopago'
import { obterPixDaAdesao } from '@/lib/pix-adesao'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST { ref } → devolve (ou gera) o Pix da taxa de adesão do cadastro.
 * A ref (UUID imprevisível) funciona como credencial. O valor cobrado é o do cadastro,
 * fixado pelo servidor a partir do token de cotação assinado — o navegador não envia valor.
 */
export async function POST(req: NextRequest) {
  try {
    if (!mpEnabled()) {
      return NextResponse.json({ error: 'Pagamento online indisponível no momento.' }, { status: 503 })
    }
    if (!rateLimit(req, 'pix-create', 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
    const lead = ref ? findLeadByRef(ref) : undefined
    if (!lead) {
      return NextResponse.json({ error: 'Link inválido ou expirado. Faça uma nova cotação.' }, { status: 404 })
    }

    const r = await obterPixDaAdesao(lead)
    switch (r.status) {
      case 'indisponivel':
        return NextResponse.json({ error: 'Pagamento online indisponível no momento.' }, { status: 503 })
      case 'cancelado':
        return NextResponse.json({ error: 'Este cadastro foi encerrado. Faça uma nova cotação ou fale com a nossa equipe.' }, { status: 410 })
      case 'pago':
        return NextResponse.json({ status: 'paid' })
      case 'gratis':
        return NextResponse.json({ status: 'gratis' })
      case 'bloqueado':
        return NextResponse.json({ status: 'bloqueado' })
      case 'limite':
        return NextResponse.json({ error: 'Limite de cobranças atingido. Fale com a nossa equipe.' }, { status: 429 })
      case 'valor_mudou':
        return NextResponse.json({ error: 'O valor da adesão mudou. Atualize a página para gerar o Pix certo.' }, { status: 409 })
      case 'pendente':
        return NextResponse.json(publicPix(r.pagamento))
    }
  } catch (err) {
    console.error('[/api/pagamento/pix]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível gerar o Pix agora. Tente novamente.' }, { status: 502 })
  }
}

function publicPix(p: LeadPagamento) {
  return {
    status: 'pending' as const,
    valor: p.valor,
    qrCode: p.qrCode,
    qrCodeBase64: p.qrCodeBase64,
    ticketUrl: p.ticketUrl,
  }
}
