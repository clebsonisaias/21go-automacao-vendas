import { guardarCotacao } from './atendai'
import { fetchOfficialPricing, identifyPlate } from './powercrm'
import { createQuoteToken } from './quote-token'

export const PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/

export function limparPlaca(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Cotação do chat (placa → veículo → planos), a mesma do site, guardada com um número curto
 * para o chat contratar. Usada pela cotação com a placa digitada e pela cotação pela foto do
 * documento. Devolve o corpo e o status HTTP da resposta.
 */
export async function cotacaoDoChat(dados: {
  placa: string
  usoApp: boolean
  leilao: boolean
  modelo: string
}): Promise<{ corpo: Record<string, unknown>; status: number }> {
  const { placa, usoApp, leilao, modelo } = dados
  const json = (corpo: Record<string, unknown>, status = 200) => ({ corpo, status })
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
