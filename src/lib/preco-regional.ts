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
 * Preço por região: quem mora no RN, na PB ou no CE vê todos os planos do CRM, com o VIP (o plano
 * que a Tabela Nordeste substitui) em primeiro e em promoção, pela mensalidade da tabela, sem
 * pontualidade nem adesivo por cima. Os outros planos seguem o preço do CRM, com os descontos de
 * sempre (decisão do Clebson, 24/11/2026). O resto do Brasil: o preço do CRM. Recusa do CRM
 * continua recusa, e FIPE fora das faixas da tabela fica com o preço do CRM.
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

  // O VIP em promoção primeiro (o destaque); os outros planos como o CRM deu.
  result.plans = [plano, ...result.plans.filter((p) => p.id !== plano.id).map((p) => ({ ...p, popular: false }))]
  result.regiao.tabela = true
  return result
}
