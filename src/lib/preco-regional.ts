import { montarPlanoNordeste } from '@/lib/pricing'
import { getBrands, getModels } from '@/lib/powercrm'
import { naRegiaoDaTabela, normalizarUf, type VeiculoParaTabela } from '@/lib/tabela-nordeste'
import { utilitariosParaCotacao } from '@/lib/utilitarios'
import type { QuoteCalculationResult, VehicleType } from '@/lib/types'

/** Tipo, marca e nome do veículo que decidem a categoria da tabela: só os conferidos no servidor. */
export type VeiculoConferido = Omit<VeiculoParaTabela, 'fipe'>

/**
 * Confere no motor de preço que a marca é do tipo informado (as listas de marcas de carro e de
 * moto têm códigos diferentes) e que o modelo existe com esse código FIPE, e devolve o nome
 * oficial. O nome e o tipo que vêm do navegador não decidem a faixa da tabela: trocando o nome,
 * um utilitário passaria por carro de passeio. Sem conferir, não há preço regional.
 */
export async function conferirVeiculo(d: {
  tipo: unknown
  brandId: unknown
  modelId: unknown
  year: unknown
  codFipe: unknown
}): Promise<VeiculoConferido | null> {
  const tipo: VehicleType = d.tipo === 'moto' ? 'moto' : 'carro'
  try {
    const marcas = await getBrands(tipo)
    const marca = marcas.data?.find((m) => String(m.code) === String(d.brandId))
    if (!marca) return null
    const modelos = await getModels(String(d.brandId), String(d.year))
    const modelo = modelos.data?.find((m) => String(m.code) === String(d.modelId) && m.codFipe === String(d.codFipe))
    if (!modelo) return null
    return { tipo, modelo: modelo.name, marca: marca.name }
  } catch (e) {
    console.warn('[preco-regional] não conferi o veículo:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Preço por região: quem mora no RN, na PB ou no CE paga a Tabela Nordeste (um plano só, sem
 * pontualidade nem adesivo por cima); o resto do Brasil, o preço do CRM, como sempre. Recusa do CRM continua
 * recusa, e FIPE fora das faixas da tabela fica com o preço do CRM.
 */
export function aplicarPrecoRegional(
  result: QuoteCalculationResult,
  ufBruta: unknown,
  veiculo: VeiculoConferido | null
): QuoteCalculationResult {
  const uf = normalizarUf(ufBruta)
  if (!uf) return result
  const regional = naRegiaoDaTabela(uf)
  result.regiao = { uf, regional, tabela: false }
  if (!regional || !result.success || !result.plans.length || !veiculo) return result

  const plano = montarPlanoNordeste(result.vehicle, result.plans, uf, veiculo, utilitariosParaCotacao())
  if (!plano) return result

  result.plans = [plano]
  result.regras = { ...result.regras, elegivelAdesivo: false, percentualAdesivo: 0, percentualPontualidade: 0 }
  result.regiao.tabela = true
  return result
}
