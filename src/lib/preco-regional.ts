import { montarPlanoNordeste } from '@/lib/pricing'
import { ehNordeste, normalizarUf } from '@/lib/tabela-nordeste'
import { utilitariosParaCotacao } from '@/lib/utilitarios'
import type { QuoteCalculationResult, VehicleType } from '@/lib/types'

/**
 * Preço por região: quem mora no Nordeste paga a Tabela Nordeste (um plano só, sem pontualidade
 * nem adesivo por cima); quem mora fora, o preço do CRM, como sempre. Recusa do CRM continua
 * recusa, e FIPE fora das faixas da tabela fica com o preço do CRM.
 */
export function aplicarPrecoRegional(result: QuoteCalculationResult, ufBruta: unknown, tipo: VehicleType): QuoteCalculationResult {
  const uf = normalizarUf(ufBruta)
  if (!uf) return result
  const nordeste = ehNordeste(uf)
  result.regiao = { uf, nordeste, tabela: false }
  if (!nordeste || !result.success || !result.plans.length) return result

  const ehMoto = tipo === 'moto' || !!result.vehicle.categoria?.toUpperCase().includes('MOTO')
  const plano = montarPlanoNordeste(result.vehicle, result.plans, uf, ehMoto ? 'moto' : 'carro', utilitariosParaCotacao())
  if (!plano) return result

  result.plans = [plano]
  result.regras = { ...result.regras, elegivelAdesivo: false, percentualAdesivo: 0, percentualPontualidade: 0 }
  result.regiao.tabela = true
  return result
}
