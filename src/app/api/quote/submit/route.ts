import { NextRequest, NextResponse } from 'next/server'
import { sendLeadToPowerCrm } from '@/lib/powercrm-lead'
import { sendLeadToCrm } from '@/lib/crm'
import { sendTelegramNotification } from '@/lib/telegram'
import { sendWhatsAppQuoteMessage } from '@/lib/citchat'
import { saveNewLead } from '@/lib/db'
import { LeadSubmissionPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload: LeadSubmissionPayload = await req.json()

    if (!payload.nome || !payload.whatsapp || !payload.planoEscolhidoId) {
      return NextResponse.json(
        { error: 'Nome, WhatsApp e Plano são obrigatórios' },
        { status: 400 }
      )
    }

    const leadRef = `lead_${Date.now()}`

    // 1. Cadastra diretamente no Power CRM com código de consultor CITmax (vrXbXyyq)
    const powerCrmResult = await sendLeadToPowerCrm(payload)

    // 2. Se configuradas as credenciais do CRM 21 Go, também notifica o CRM 21 Go
    const crmResult = await sendLeadToCrm(payload)

    // 3. Salva no nosso banco de dados de backup local
    const storedLead = saveNewLead(payload, leadRef, powerCrmResult.qttnCd)

    // 4. Formatações para notificação
    const fipeFormatted = payload.vehicle.fipeValue
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          payload.vehicle.fipeValue
        )
      : 'Sob consulta'

    const mensalidadeFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(payload.mensalidadeFinal)

    const ativacaoFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(payload.ativacao)

    const vistoriaUrl = `/vistoria?ref=${leadRef}&nome=${encodeURIComponent(
      payload.nome
    )}&placa=${encodeURIComponent(payload.placa || payload.vehicle.placa || '')}&veiculo=${encodeURIComponent(
      `${payload.vehicle.marca} ${payload.vehicle.modelo}`
    )}`

    // 5. Dispara Notificação Instantânea no Telegram para você
    const telegramMessage = `🚨 <b>NOVO CADASTRO NO SITE!</b> 🚨

👤 <b>Cliente:</b> ${payload.nome}
📱 <b>WhatsApp:</b> ${payload.whatsapp}
${payload.cpf ? `📄 <b>CPF:</b> ${payload.cpf}\n` : ''}${payload.email ? `✉️ <b>E-mail:</b> ${payload.email}\n` : ''}${payload.cidade ? `📍 <b>Cidade:</b> ${payload.cidade}\n` : ''}🚗 <b>Veículo:</b> ${payload.vehicle.marca} ${payload.vehicle.modelo} (${payload.vehicle.ano})
🔢 <b>Placa:</b> ${payload.placa || payload.vehicle.placa || 'Não informada'}
💰 <b>Tabela FIPE:</b> ${fipeFormatted}
🚕 <b>Trabalho/App:</b> ${payload.veiculoTrabalho ? 'Sim' : 'Não'}

🛡️ <b>Plano Escolhido:</b> ${payload.planoEscolhidoNome}
💵 <b>Mensalidade:</b> ${mensalidadeFormatted}/mês ${payload.comAdesivo ? '(com adesivo)' : ''}
⚡ <b>Ativação:</b> ${ativacaoFormatted}

${powerCrmResult.qttnCd ? `📋 <b>Código PowerCRM:</b> <code>${powerCrmResult.qttnCd}</code>\n` : ''}💾 <b>Backup Local:</b> Salvo no painel interno (ID: <code>${storedLead.id}</code>)
✅ <b>Status:</b> Cadastrado e aguardando vistoria digital.`

    await sendTelegramNotification(telegramMessage)

    // 6. Dispara WhatsApp automático via AtendeHub / CITchat para o cliente
    await sendWhatsAppQuoteMessage(payload)

    return NextResponse.json({
      success: true,
      leadId: storedLead.id,
      powerCrmSuccess: powerCrmResult.success,
      powerCrmQuotationCode: powerCrmResult.qttnCd,
      crmSuccess: crmResult.success,
      cardId: crmResult.cardId,
      vistoriaUrl,
      message: 'Cadastro realizado e salvo com sucesso!',
    })
  } catch (err: any) {
    console.error('Erro ao processar envio do lead:', err)
    return NextResponse.json(
      { error: err.message || 'Erro interno ao processar lead' },
      { status: 500 }
    )
  }
}
