import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi, HinovaAssistenciaRequest } from '@/lib/hinova-api'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    const body = await req.json().catch(() => ({}))
    const {
      tipoServico,
      placa,
      telefoneContato,
      enderecoOrigem,
      enderecoDestino,
      descricao,
      latitude,
      longitude,
    } = body

    if (!tipoServico || !placa || !telefoneContato || !enderecoOrigem) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos obrigatórios ausentes: tipoServico, placa, telefoneContato e enderecoOrigem.',
        },
        { status: 400 }
      )
    }

    const payload: HinovaAssistenciaRequest = {
      tipoServico,
      placa,
      telefoneContato,
      enderecoOrigem,
      enderecoDestino,
      descricao: descricao || 'Solicitação aberta pela Central do Cliente 21Go',
      latitude,
      longitude,
    }

    const result = await hinovaApi.solicitarAssistencia(token, payload)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/cliente/assistencia] Erro:', message)
    return NextResponse.json(
      { success: false, error: `Falha ao processar solicitação de assistência: ${message}` },
      { status: 500 }
    )
  }
}
