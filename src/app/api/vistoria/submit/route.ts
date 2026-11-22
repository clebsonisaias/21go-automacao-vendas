import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { concluirDocumentos } from '@/lib/documentos'

export const dynamic = 'force-dynamic'

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)


export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'vistoria-submit', 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const ref = text(body?.ref, 80)

    // Só aceita vistoria para um cadastro existente: a ref (UUID) funciona como credencial.
    // O telefone e o nome vêm do cadastro salvo, nunca do corpo da requisição.
    const lead = ref ? findLeadByRef(ref) : undefined
    if (!lead) {
      return NextResponse.json(
        { error: 'Link de vistoria inválido ou expirado. Faça uma nova cotação.' },
        { status: 404 }
      )
    }
    // Só conclui com os documentos realmente gravados no servidor (enviados por /api/vistoria/upload).
    const r = await concluirDocumentos(lead.ref, { avisarWhatsApp: true, origem: 'site' })
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })

    // Adesão por último: o Pix só é liberado pela equipe depois da vistoria aprovada.
    return NextResponse.json({
      success: true,
      message: 'Documentos recebidos! Nossa equipe envia o link da vistoria no seu WhatsApp.',
    })
  } catch (err) {
    console.error('Erro ao processar vistoria:', err)
    return NextResponse.json(
      { error: 'Não foi possível processar a vistoria agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
