import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendWhatsAppVistoriaConfirmation } from '@/lib/citchat'
import { findLeadByRef, updateLeadVistoria } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

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

    const cnhOuRgNome = text(body.cnhOuRgNome, 120)
    const crlvNome = text(body.crlvNome, 120)
    const comprovanteResidenciaNome = text(body.comprovanteResidenciaNome, 120)
    const totalFotos = Math.min(Math.max(Number(body.totalFotos) || 0, 0), 20)

    updateLeadVistoria(lead.ref, { cnhOuRgNome, crlvNome, comprovanteResidenciaNome, totalFotos })

    const veiculo = `${lead.vehicle.marca} ${lead.vehicle.modelo}`
    const telegramMessage = `📸 <b>VISTORIA DIGITAL RECEBIDA!</b> 📸

👤 <b>Cliente:</b> ${esc(lead.nome)}
🚗 <b>Veículo:</b> ${esc(veiculo)}
🔢 <b>Placa:</b> ${esc(lead.placa || 'Não informada')}
🔖 <b>Ref:</b> <code>${esc(lead.ref)}</code>

📁 <b>Documentos Enviados:</b>
- CNH ou RG: ${cnhOuRgNome ? `✅ ${esc(cnhOuRgNome)}` : 'Pendente'}
- Documento do Veículo (CRLV): ${crlvNome ? `✅ ${esc(crlvNome)}` : 'Pendente'}
- Comprovante de Residência: ${comprovanteResidenciaNome ? `✅ ${esc(comprovanteResidenciaNome)}` : 'Pendente'}
- Fotos do Veículo: ✅ ${totalFotos} fotos enviadas

💡 <b>Ação Recomendada:</b> Acesse o Power CRM e aprove a vistoria para ativação imediata!`

    await sendTelegramNotification(telegramMessage)

    await sendWhatsAppVistoriaConfirmation({
      telefone: lead.whatsapp,
      nome: lead.nome,
      placa: lead.placa || 'Veículo',
    })

    return NextResponse.json({
      success: true,
      message: 'Vistoria e documentos recebidos com sucesso! Nossa equipe entrará em contato.',
    })
  } catch (err) {
    console.error('Erro ao processar vistoria:', err)
    return NextResponse.json(
      { error: 'Não foi possível processar a vistoria agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
