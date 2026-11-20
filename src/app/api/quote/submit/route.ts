import { NextRequest, NextResponse } from 'next/server'
import { sendLeadToCrm } from '@/lib/crm'
import { LeadSubmissionPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

const FRANQUIA_WHATSAPP = process.env.FRANQUIA_WHATSAPP || '5521999999999'

export async function POST(req: NextRequest) {
  try {
    const payload: LeadSubmissionPayload = await req.json()

    if (!payload.nome || !payload.whatsapp || !payload.planoEscolhidoId) {
      return NextResponse.json(
        { error: 'Nome, WhatsApp e Plano são obrigatórios' },
        { status: 400 }
      )
    }

    // 1. Registra no CRM 21 Go (vinculado à conta do vendedor/franquia)
    const crmResult = await sendLeadToCrm(payload)

    // 2. Prepara mensagem formatada para o WhatsApp da franquia
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

    const rawMessage = `Olá! Gostaria de contratar a proteção veicular da 21Go.

*Dados do Veículo:*
- Modelo: ${payload.vehicle.marca} ${payload.vehicle.modelo} (${payload.vehicle.ano})
- Placa: ${payload.placa || payload.vehicle.placa || 'A informar'}
- Tabela FIPE: ${fipeFormatted}

*Plano Escolhido:*
- Plano: ${payload.planoEscolhidoNome}
- Mensalidade: ${mensalidadeFormatted}/mês ${payload.comAdesivo ? '(com desconto de adesivo)' : ''}
- Ativação/Adesão: ${ativacaoFormatted}

*Meus Dados:*
- Nome: ${payload.nome}
- Telefone/WhatsApp: ${payload.whatsapp}
${payload.email ? `- E-mail: ${payload.email}` : ''}

Podemos dar andamento no cadastro?`

    const cleanNumber = FRANQUIA_WHATSAPP.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(rawMessage)}`

    return NextResponse.json({
      success: true,
      crmSuccess: crmResult.success,
      crmMessage: crmResult.message,
      cardId: crmResult.cardId,
      whatsappUrl,
    })
  } catch (err: any) {
    console.error('Erro ao processar envio do lead:', err)
    return NextResponse.json(
      { error: err.message || 'Erro interno ao processar lead' },
      { status: 500 }
    )
  }
}
