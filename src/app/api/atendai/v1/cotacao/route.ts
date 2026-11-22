import { NextRequest } from 'next/server'
import { autorizarAtendai, guardarCotacao, json } from '@/lib/atendai'
import { fetchOfficialPricing, identifyPlate } from '@/lib/powercrm'
import { createQuoteToken } from '@/lib/quote-token'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/

/**
 * POST { placa, usoApp?, leilao?, modelo? } → a mesma cotação do site (placa →
 * veículo → planos), guardada aqui com um número curto para o chat contratar.
 * Placa com mais de um modelo devolve as opções (`escolherModelo`).
 */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-cotacao', 60, 10 * 60 * 1000)) {
    return json({ erro: 'Muitas cotações seguidas. Tente de novo em alguns minutos.' }, 429)
  }

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }
  const placa = String(corpo?.placa ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!PLACA.test(placa)) {
    return json({ erro: 'Placa inválida. Informe os 7 caracteres (ex.: ABC1D23).' }, 400)
  }
  const usoApp = corpo?.usoApp === true
  const leilao = corpo?.leilao === true
  const modelo = typeof corpo?.modelo === 'string' ? corpo.modelo.trim().slice(0, 40) : ''

  try {
    const achado = await identifyPlate(placa)
    if (achado.status === 'notfound') {
      return json({ erro: 'Placa não encontrada na base nacional. Confira a placa digitada. Se estiver certa, dá para fazer a cotação escolhendo marca, modelo e ano no site 21go.seg.br.' }, 404)
    }

    let modelId = achado.modelId
    let modelText = achado.modelText
    let codFipe = achado.codFipe
    if (modelo) {
      const escolhido = achado.candidates?.find((c) => String(c.code) === modelo)
      if (!escolhido) {
        return json({ erro: 'Esse modelo não é uma das opções desta placa. Escolha de novo entre as opções.' }, 400)
      }
      modelId = escolhido.code
      modelText = escolhido.name
      codFipe = escolhido.codFipe
    }

    if (!modelId || !codFipe) {
      const modelos = (achado.candidates ?? [])
        .slice(0, 10)
        .map((c) => ({ codigo: String(c.code), nome: c.name }))
      if (!modelos.length) {
        return json({ erro: 'Não consegui identificar o modelo desta placa. Dá para fazer a cotação escolhendo marca, modelo e ano no site 21go.seg.br.' }, 422)
      }
      return json({
        escolherModelo: true,
        mensagem: `Encontrei mais de um modelo para a placa ${placa}. Qual é o do cliente?`,
        modelos,
      })
    }
    if (!achado.brandId || !achado.year) {
      return json({ erro: 'Não consegui identificar o veículo desta placa. Dá para fazer a cotação escolhendo marca, modelo e ano no site 21go.seg.br.' }, 422)
    }

    const r = await fetchOfficialPricing({
      tipo: achado.tipo || 'carro',
      brandId: achado.brandId,
      brandText: achado.brandText || '',
      modelId,
      modelText: modelText || '',
      year: achado.year,
      codFipe,
      leilao: leilao ? 'leilao' : 'nao',
      carroApp: usoApp ? 'sim' : 'nao',
    })
    if (!r.success || !r.plans.length) {
      return json(
        { erro: r.error || 'Este veículo não está disponível para contratação no momento.' },
        422
      )
    }

    const token = createQuoteToken(r.vehicle, r.plans, r.powercrmMeta)
    if (!token) return json({ erro: 'Não foi possível concluir a cotação agora.' }, 502)
    const { id, expiraEm } = guardarCotacao({
      token,
      placa,
      usoApp,
      elegivelAdesivo: Boolean(r.regras?.elegivelAdesivo),
    })

    return json({
      cotacao: id,
      validaAte: new Date(expiraEm).toISOString(),
      veiculo: {
        placa,
        marca: r.vehicle.marca,
        modelo: r.vehicle.modelo,
        ano: r.vehicle.ano,
        fipe: r.vehicle.fipeValue || null,
      },
      planos: r.plans.map((p) => ({
        id: p.id,
        nome: p.name,
        mensalidade: p.monthly,
        mensalidadePontualidade: p.mensalidadeComPontualidade,
        // Mesma regra do site: o adesivo só vale para o veículo elegível.
        mensalidadeAdesivo: r.regras?.elegivelAdesivo ? p.mensalidadeComAdesivo : null,
        ativacao: p.ativacao,
        coberturas: p.coberturas,
        popular: Boolean(p.popular),
      })),
      observacao: r.regras?.exigeVistoriaPresencial ? 'Este veículo exige vistoria presencial.' : null,
    })
  } catch (err) {
    console.error('[atendai] cotação falhou:', err instanceof Error ? err.message : err)
    return json({ erro: 'Não foi possível calcular a cotação agora. Tente de novo em instantes.' }, 502)
  }
}
