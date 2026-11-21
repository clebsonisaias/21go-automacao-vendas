import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendWhatsAppVistoriaConfirmation } from '@/lib/citchat'
import { findLeadByRef, updateLeadVistoria } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { mpEnabled } from '@/lib/mercadopago'
import { pagamentoPath } from '@/lib/links'

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
    const arq = lead.vistoriaArquivos || {}
    if (!arq.cnhOuRg || !arq.crlv || !arq.comprovanteResidencia) {
      return NextResponse.json(
        { error: 'Faltam documentos: envie CNH ou RG, CRLV e comprovante de residência.' },
        { status: 400 }
      )
    }
    const cnhOuRgNome = arq.cnhOuRg.originalName
    const crlvNome = arq.crlv.originalName
    const comprovanteResidenciaNome = arq.comprovanteResidencia.originalName
    const totalFotos = Object.keys(arq).filter((k) => k.startsWith('foto')).length

    updateLeadVistoria(lead.ref, { cnhOuRgNome, crlvNome, comprovanteResidenciaNome, totalFotos })

    const veiculo = `${lead.vehicle.marca} ${lead.vehicle.modelo}`
    const telegramMessage = `📄 <b>DOCUMENTOS RECEBIDOS!</b> 📄

👤 <b>Cliente:</b> ${esc(lead.nome)}
🚗 <b>Veículo:</b> ${esc(veiculo)}
🔢 <b>Placa:</b> ${esc(lead.placa || 'Não informada')}
🔖 <b>Ref:</b> <code>${esc(lead.ref)}</code>

📁 <b>Documentos Enviados:</b>
- CNH ou RG: ${cnhOuRgNome ? `✅ ${esc(cnhOuRgNome)}` : 'Pendente'}
- Documento do Veículo (CRLV): ${crlvNome ? `✅ ${esc(crlvNome)}` : 'Pendente'}
- Comprovante de Residência: ${comprovanteResidenciaNome ? `✅ ${esc(comprovanteResidenciaNome)}` : 'Pendente'}

💡 <b>Próximo passo:</b> o cliente segue para o Pix da adesão. Depois, gere no CRM o link do App Visto e envie a ele.`

    await sendTelegramNotification(telegramMessage)

    await sendWhatsAppVistoriaConfirmation({
      telefone: lead.whatsapp,
      nome: lead.nome,
      placa: lead.placa || 'Veículo',
    })

    // Adesão por último: depois da vistoria, o cliente segue para o Pix (se ainda não pagou).
    const pagamentoUrl = mpEnabled() && !lead.pagamento?.paidAt ? pagamentoPath(lead.ref) : undefined

    return NextResponse.json({
      success: true,
      pagamentoUrl,
      message: pagamentoUrl
        ? 'Documentos recebidos! Agora pague a adesão via Pix.'
        : 'Vistoria e documentos recebidos com sucesso! Nossa equipe entrará em contato.',
    })
  } catch (err) {
    console.error('Erro ao processar vistoria:', err)
    return NextResponse.json(
      { error: 'Não foi possível processar a vistoria agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
