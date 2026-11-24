import { guardarCotacao } from './atendai'
import { fetchOfficialPricing, identifyPlate } from './powercrm'
import { createQuoteToken } from './quote-token'
import { aplicarPrecoRegional } from './preco-regional'
import { ESTADOS_DA_TABELA, normalizarUf, ufDoDdd, UFS } from './tabela-nordeste'

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
  /** Estado onde o cliente mora; sem ele, vale o DDD do telefone da conversa. */
  uf?: unknown
  telefone?: unknown
}): Promise<{ corpo: Record<string, unknown>; status: number }> {
  const { placa, usoApp, leilao, modelo } = dados
  const ufInformada = normalizarUf(dados.uf)
  const ufDdd = ufInformada ? null : ufDoDdd(dados.telefone)
  const uf = ufInformada || ufDdd
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

    // Quem mora no RN, na PB ou no CE paga a Tabela Nordeste (ver preco-regional.ts). Aqui o
    // veículo veio da consulta da placa feita no servidor.
    aplicarPrecoRegional(r, uf, {
      tipo: achado.tipo === 'moto' ? 'moto' : 'carro',
      modelo: modelText || r.vehicle.modelo,
      marca: achado.brandText || r.vehicle.marca,
    })

    const token = createQuoteToken(r.vehicle, r.plans, r.powercrmMeta, r.regiao?.uf)
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
        ...(p.regional ? { precoNacional: p.precoNacional ?? null, tabelaNordeste: p.regional.tabela } : {}),
      })),
      regiao: r.regiao ? { ...r.regiao, origem: ufInformada ? 'informada' : 'ddd' } : null,
      mensagemRegiao: mensagemRegiao(r.regiao, r.plans[0], !ufInformada),
      observacao: r.regras?.exigeVistoriaPresencial ? 'Este veículo exige vistoria presencial.' : null,
    })
  } catch (err) {
    console.error('[atendai] cotação falhou:', err instanceof Error ? err.message : err)
    return json({ erro: 'Não foi possível calcular a cotação agora. Tente de novo em instantes.' }, 502)
  }
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** Orientação para a IA do chat sobre o preço por região (o "de/por" da tabela regional). */
function mensagemRegiao(
  regiao: { uf: string; regional: boolean; tabela: boolean } | undefined,
  plano: { monthly: number; precoNacional?: number } | undefined,
  peloDdd: boolean
): string {
  if (!regiao) {
    return `Não sei onde o cliente mora. Pergunte o estado: quem mora em ${ESTADOS_DA_TABELA} paga a mensalidade da tabela regional. Depois cote de novo com "uf".`
  }
  const nome = UFS[regiao.uf] ?? regiao.uf
  const confirmar = peloDdd
    ? ` O estado veio do DDD do WhatsApp: confirme com o cliente se ele mora em ${nome}; se morar em outro estado, cote de novo com "uf".`
    : ''
  if (regiao.tabela && plano) {
    const de = plano.precoNacional && plano.precoNacional > plano.monthly ? `de ${brl(plano.precoNacional)} (preço nacional) por ` : ''
    return `Cliente de ${nome}: o VIP está em promoção pela tabela regional, ${de}${brl(plano.monthly)} por mês, já o preço final (sem desconto de pontualidade nem de adesivo). Ofereça o VIP primeiro, em destaque. Os outros planos seguem o preço nacional, com os descontos de sempre. O comprovante de residência confirma o estado.${confirmar}`
  }
  if (regiao.regional) {
    return `Cliente de ${nome}, mas a FIPE deste veículo passa da tabela regional: vale o preço nacional.${confirmar}`
  }
  return `Cliente de ${nome}: a tabela regional só vale em ${ESTADOS_DA_TABELA}, então vale o preço nacional.${confirmar}`
}
