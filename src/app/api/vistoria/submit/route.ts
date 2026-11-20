import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/telegram'
import { sendWhatsAppVistoriaConfirmation } from '@/lib/citchat'
import { updateLeadVistoria } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ref, nome, placa, veiculo, telefone, cnhOuRgNome, crlvNome, comprovanteResidenciaNome, totalFotos } = body

    // Atualiza no banco de dados de backup local
    updateLeadVistoria(ref, {
      cnhOuRgNome,
      crlvNome,
      comprovanteResidenciaNome,
      totalFotos,
    })

    const telegramMessage = `📸 <b>VISTORIA DIGITAL RECEBIDA!</b> 📸

👤 <b>Cliente:</b> ${nome || 'Não informado'}
🚗 <b>Veículo:</b> ${veiculo || 'Não informado'}
🔢 <b>Placa:</b> ${placa || 'Não informada'}
🔖 <b>Ref:</b> <code>${ref || 'N/A'}</code>

📁 <b>Documentos Enviados:</b>
- CNH ou RG: ${cnhOuRgNome ? `✅ ${cnhOuRgNome}` : 'Pendente'}
- Documento do Veículo (CRLV): ${crlvNome ? `✅ ${crlvNome}` : 'Pendente'}
- Comprovante de Residência: ${comprovanteResidenciaNome ? `✅ ${comprovanteResidenciaNome}` : 'Pendente'}
- Fotos do Veículo: ✅ ${totalFotos || 0} fotos enviadas

💡 <b>Ação Recomendada:</b> Acesse o Power CRM e aprove a vistoria para ativação imediata!`

    await sendTelegramNotification(telegramMessage)

    if (telefone) {
      await sendWhatsAppVistoriaConfirmation({
        telefone,
        nome: nome || 'Cliente',
        placa: placa || 'Veículo',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Vistoria e documentos recebidos com sucesso! Nossa equipe entrará em contato.',
    })
  } catch (err: any) {
    console.error('Erro ao processar vistoria:', err)
    return NextResponse.json(
      { error: err.message || 'Erro ao processar vistoria' },
      { status: 500 }
    )
  }
}
