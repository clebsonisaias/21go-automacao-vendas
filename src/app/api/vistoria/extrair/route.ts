import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef, updateLead } from '@/lib/db'
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
    // Pessoa só da CNH; endereço só do comprovante; carro só do CRLV (o carro pode ser de terceiro).
    const tipo = extracted.documentType

    const lead = findLeadByRef(ref)
    if (!lead) {
      return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    }

    const updated = updateLead(ref, (l) => {
      // Dados pessoais da CNH
      if (tipo === 'cnh') {
        if (extracted.personal?.nome && !l.nome) l.nome = extracted.personal.nome
        if (extracted.personal?.cpf && !l.cpf) l.cpf = extracted.personal.cpf
      }

      // Endereço do comprovante
      if (tipo === 'comprovante_residencia') {
        if (extracted.address?.cidade && !l.cidade) l.cidade = extracted.address.cidade
        if (extracted.address?.uf && !l.uf) l.uf = extracted.address.uf
      }
      if (tipo !== 'crlv') return

      // Dados do veículo do CRLV
      if (extracted.vehicle?.placa && !l.placa) l.placa = extracted.vehicle.placa
      if (extracted.vehicle?.chassi && !l.vehicle.chassi) l.vehicle.chassi = extracted.vehicle.chassi
      if (extracted.vehicle?.renavam && !l.vehicle.renavam) l.vehicle.renavam = extracted.vehicle.renavam
      if (extracted.vehicle?.marca && !l.vehicle.marca) l.vehicle.marca = extracted.vehicle.marca
      if (extracted.vehicle?.modelo && !l.vehicle.modelo) l.vehicle.modelo = extracted.vehicle.modelo
      if (extracted.vehicle?.anoModelo && !l.vehicle.ano) l.vehicle.ano = String(extracted.vehicle.anoModelo)
    })

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
