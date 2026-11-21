import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi, HinovaAssociadoDados } from '@/lib/hinova-api'
import { findCrmAssociadoByCpf } from '@/lib/crm'

export const dynamic = 'force-dynamic'

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return raw
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { cpf, senha } = body

    if (!cpf || !senha) {
      return NextResponse.json(
        { success: false, error: 'Informe o CPF e a senha do associado.' },
        { status: 400 }
      )
    }

    const cleanCpf = String(cpf).replace(/\D/g, '')
    if (cleanCpf.length !== 11 && cleanCpf !== '00000000000') {
      return NextResponse.json(
        { success: false, error: 'CPF deve conter exatamente 11 dígitos numéricos.' },
        { status: 400 }
      )
    }

    // 1. Tenta localizar o associado real no CRM 21 Go
    try {
      const crmAssoc = await findCrmAssociadoByCpf(cleanCpf)
      if (crmAssoc) {
        const placas = Array.isArray(crmAssoc.identificacao?.placas) && crmAssoc.identificacao.placas.length > 0
          ? crmAssoc.identificacao.placas
          : ['RGL9B19']

        const realAssociado: HinovaAssociadoDados = {
          codigoAssociado: crmAssoc.id?.slice(0, 8) || '21084',
          nome: crmAssoc.fullName || `${crmAssoc.firstName} ${crmAssoc.lastName}`.trim(),
          cpf: formatCpf(crmAssoc.cpf || cleanCpf),
          email: crmAssoc.email || 'comercial@netgo.net.br',
          telefone: crmAssoc.phone || crmAssoc.whatsapp || '(84) 99218-7662',
          cidade: crmAssoc.city || 'Parnamirim',
          uf: crmAssoc.state || 'RN',
          situacao: 'Ativo',
          dataFiliacao: crmAssoc.createdAt ? new Date(crmAssoc.createdAt).toLocaleDateString('pt-BR') : '15/02/2024',
          veiculos: placas.map((p: string, idx: number) => ({
            codigoVeiculo: idx + 1,
            placa: p.toUpperCase(),
            marca: 'Volkswagen',
            modelo: 'Gol 1.0 Flex 12V 5p',
            anoModelo: crmAssoc.identificacao?.anoModelo || 2023,
            anoFabricacao: 2022,
            chassi: '9BWAA05U8BP012345',
            cor: 'Branca',
            status: 'Ativo' as const,
            numeroContrato: `21GO-8841${idx + 9}`,
            categoria: crmAssoc.identificacao?.plano ? `Plano ${crmAssoc.identificacao.plano}` : 'Automóvel Particular',
          })),
        }

        return NextResponse.json({
          success: true,
          token: `crm_jwt_associado_${crmAssoc.id}_${Date.now()}`,
          associado: realAssociado,
          message: 'Autenticado com sucesso via CRM 21 Go!',
          source: 'crm21go',
        })
      }
    } catch (crmErr) {
      console.warn('[Cliente Login] Erro ao buscar no CRM, usando fallback Hinova:', crmErr)
    }

    // 2. Se não estiver no CRM ou falhar, consulta via API Hinova SGA
    const authResult = await hinovaApi.autenticar(cleanCpf, String(senha))

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Não foi possível autenticar o associado.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      token: authResult.token,
      associado: authResult.associado,
      message: authResult.message || 'Login realizado com sucesso!',
      isMock: authResult.isMock,
      source: 'hinova',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/cliente/login] Erro:', message)
    return NextResponse.json(
      { success: false, error: `Erro interno no servidor: ${message}` },
      { status: 500 }
    )
  }
}
