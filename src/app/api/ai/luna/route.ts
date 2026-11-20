import { NextRequest, NextResponse } from 'next/server'
import { chatWithLuna, generateLunaPitch, LunaChatMessage } from '@/lib/luna-ai'

export const dynamic = 'force-dynamic'

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

      const pitch = await generateLunaPitch({
        nome: lead.nome,
        veiculo: `${lead.vehicle.marca} ${lead.vehicle.modelo}`,
        placa: lead.placa,
        mensalidade: lead.estimatedMonthly,
        fipe: lead.vehicle.fipe,
        objecao: objecao || objection,
      })

      return NextResponse.json({ success: true, pitch })
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

    const reply = await chatWithLuna(chatMessages)

    return NextResponse.json({
      success: true,
      reply,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/ai/luna] Erro:', msg)
    return NextResponse.json(
      { success: false, error: `Erro na IA Luna: ${msg}` },
      { status: 500 }
    )
  }
}
