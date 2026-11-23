import { NextRequest, NextResponse } from 'next/server'
import { chatWithLuna, generateLunaPitch, LunaChatMessage } from '@/lib/luna-ai'

export const dynamic = 'force-dynamic'

function botFallbackReply(lastText: string): string {
  const t = lastText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (/(sinistro|batida|colisao|roubo|furto|incendio|alagamento|guincho|reboque|pane|chaveiro|pneu|emergencia|acidente)/.test(t)) {
    return 'Para emergência, guincho ou sinistro, ligue agora para a central 24h da 21Go no 0800 234 5555 (atendimento em todo o Brasil). Se houver feridos ou risco, ligue primeiro para 192 (SAMU) ou 190 (Polícia).'
  }

  if (/(spc|serasa|nome sujo|negativado|score|perfil|condutor|motorista)/.test(t)) {
    return 'A 21Go não consulta SPC/Serasa e não tem perfil de condutor: qualquer motorista habilitado (CNH em dia) pode dirigir o veículo. Você pode simular pela placa no topo da página!'
  }

  if (/(vistoria|documento|cnh|crlv|comprovante|foto)/.test(t)) {
    return 'Depois de escolher seu plano, você envia as fotos ou PDFs da CNH (ou RG), documento do veículo (CRLV) e comprovante de residência. Em seguida enviamos o link da vistoria 100% pelo celular!'
  }

  if (/(pix|adesao|pagar|pagamento|taxa|boleto|cupom)/.test(t)) {
    return 'A taxa de adesão só é paga no final, depois que a vistoria pelo celular for aprovada. Assim que aprovar, enviamos o Pix da adesão no seu WhatsApp e por aqui no site.'
  }

  if (/(app|aplicativo|acesso|login|email|e-mail)/.test(t)) {
    return 'Assim que o cadastro e a adesão forem concluídos, os dados de acesso são enviados para o seu e-mail cadastrado. Depois é só baixar o aplicativo 21Go na loja do celular (Play Store ou App Store).'
  }

  if (/(cotar|cotacao|preco|valor|plano|placa|quanto custa|simular)/.test(t)) {
    return 'Para ver os valores exatos do seu veículo na hora, digite a placa na calculadora aqui no topo da página! Você vê os 4 planos (Básico, Do Seu Jeito, VIP e Premium) e já pode finalizar o cadastro.'
  }

  return 'Oi! Posso te ajudar com a proteção veicular 21Go: sem consulta SPC/Serasa, sem perfil de condutor, assistência 24h em todo o Brasil e vistoria 100% pelo celular. Digite a placa do seu veículo no topo da página para ver os valores na hora!'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action = 'chat', messages, prompt, lead, objection, objecao } = body

    if (action === 'pitch') {
      if (!lead?.nome || !lead?.vehicle?.modelo) {
        return NextResponse.json(
          { success: false, error: 'Dados insuficientes do lead para gerar pitch.' },
          { status: 400 }
        )
      }

      try {
        const pitch = await generateLunaPitch({
          nome: lead.nome,
          veiculo: `${lead.vehicle.marca} ${lead.vehicle.modelo}`,
          placa: lead.placa,
          mensalidade: lead.estimatedMonthly,
          fipe: lead.vehicle.fipe,
          objecao: objecao || objection,
        })
        return NextResponse.json({ success: true, pitch })
      } catch (err) {
        console.warn('[/api/ai/luna] Pitch fallback sem IA:', err instanceof Error ? err.message : err)
        const pitch = `Olá, ${lead.nome}! Vi sua cotação na 21Go para o ${lead.vehicle.marca} ${lead.vehicle.modelo} (${lead.placa}). Proteção completa sem SPC/Serasa, sem perfil de condutor e vistoria 100% pelo celular. Posso te ajudar a finalizar seu cadastro hoje?`
        return NextResponse.json({ success: true, pitch, fallback: true })
      }
    }

    // Default: chat
    let chatMessages: LunaChatMessage[] = []

    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages
    } else if (prompt && typeof prompt === 'string') {
      chatMessages = [{ role: 'user', content: prompt }]
    } else {
      return NextResponse.json(
        { success: false, error: 'Envie "messages" ou "prompt".' },
        { status: 400 }
      )
    }

    try {
      const reply = await chatWithLuna(chatMessages)
      return NextResponse.json({ success: true, reply })
    } catch (err) {
      console.warn('[/api/ai/luna] Chat fallback sem IA:', err instanceof Error ? err.message : err)
      const lastUser = [...chatMessages].reverse().find((m) => m.role === 'user')?.content || ''
      return NextResponse.json({
        success: true,
        reply: botFallbackReply(lastUser),
        fallback: true,
      })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/ai/luna] Erro:', msg)
    return NextResponse.json(
      { success: true, reply: botFallbackReply(''), fallback: true }
    )
  }
}
