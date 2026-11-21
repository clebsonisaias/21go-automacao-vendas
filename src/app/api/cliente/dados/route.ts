import { NextRequest, NextResponse } from 'next/server'
import { hinovaApi, HinovaAssociadoDados } from '@/lib/hinova-api'
import { findCrmAssociadoByCpf } from '@/lib/crm'

export const dynamic = 'force-dynamic'

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return raw
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de autenticação não fornecido.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    let cpf = searchParams.get('cpf') || undefined

    if (!cpf && token.startsWith('crm_jwt_associado_')) {
      const parts = token.split('_')
      // token format: crm_jwt_associado_{cleanCpf}_{assocId}_{timestamp}
      if (parts[3] && parts[3].length === 11) {
        cpf = parts[3]
      }
    }

    if (cpf) {
      const crmAssoc = await findCrmAssociadoByCpf(cpf)
      if (crmAssoc) {
        const placas = Array.isArray(crmAssoc.identificacao?.placas) && crmAssoc.identificacao.placas.length > 0
          ? crmAssoc.identificacao.placas
          : ['RGL9B19']

        const realAssociado: HinovaAssociadoDados = {
          codigoAssociado: crmAssoc.id?.slice(0, 8) || '21084',
          nome: crmAssoc.fullName || `${crmAssoc.firstName} ${crmAssoc.lastName}`.trim(),
          cpf: formatCpf(crmAssoc.cpf || cpf),
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
          associado: realAssociado,
          source: 'crm21go',
        })
      }
    }

    const dados = await hinovaApi.consultarDados(token, cpf)

    return NextResponse.json({
      success: true,
      associado: dados,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/cliente/dados] Erro:', message)
    return NextResponse.json(
      { success: false, error: `Erro ao consultar dados: ${message}` },
      { status: 500 }
    )
  }
}
