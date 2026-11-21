import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendWhatsAppVistoriaConfirmation } from '@/lib/citchat'
import { findLeadByRef, updateLeadVistoria } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { gerarLinkVistoria } from '@/lib/crm-vistoria'

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
    if (lead.status === 'cancelado') {
      return NextResponse.json({ error: 'Este cadastro foi encerrado. Faça uma nova cotação ou fale com a nossa equipe.' }, { status: 410 })
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

💡 <b>Próximo passo:</b> o site gera sozinho o link da vistoria no CRM 21Go e manda ao cliente (aviso aqui quando sair). Com a vistoria aprovada, clique no /admin em "Vistoria aprovada: enviar Pix" (a adesão é o último passo).`

    await sendTelegramNotification(telegramMessage)

    await sendWhatsAppVistoriaConfirmation({
      telefone: lead.whatsapp,
      nome: lead.nome,
      placa: lead.placa || 'Veículo',
    })

    // Gera o link da vistoria no CRM 21Go em segundo plano; a tela do cliente mostra quando sair.
    void gerarLinkVistoria(lead.ref)

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
