import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef } from '@/lib/db'
import { aplicarLeitura } from '@/lib/documentos'
import { DocumentAiResult } from '@/lib/types'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Recebe dados extraídos da IA e completa o cadastro do lead (só preenche o que está vazio). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ref = typeof body?.ref === 'string' ? body.ref : ''
    const extracted = body?.extracted as DocumentAiResult | undefined

    if (!ref || !extracted?.success) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    // Leitura que falhou volta como "simulation" (dados de exemplo): nunca grava no cadastro.
    if (extracted.model === 'simulation') {
      return NextResponse.json({ success: false, error: 'Leitura não confiável; nada foi gravado.' }, { status: 422 })
    }
    if (!rateLimit(req, 'vistoria-extrair', 30, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitas tentativas.' }, { status: 429 })
    }
    const lead = findLeadByRef(ref)
    if (!lead) {
      return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    }

    // Só preenche o que está vazio, e cada documento só os próprios campos (src/lib/documentos.ts).
    const updated = aplicarLeitura(ref, extracted)

    return NextResponse.json({
      success: true,
      lead: {
        nome: updated?.nome,
        cpf: updated?.cpf,
        cidade: updated?.cidade,
        placa: updated?.placa,
      },
    })
  } catch (err) {
    console.error('[extrair] erro:', err)
    return NextResponse.json({ error: 'Não foi possível atualizar os dados.' }, { status: 500 })
  }
}
