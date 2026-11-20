import type { PlanPricing, QuoteCalculationResult } from './types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** "R$ 1.234,56" */
export function formatBRL(value: number): string {
  return brl.format(value)
}

/** "1.234,56" (sem símbolo, para o preço grande do plano) */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export interface DiscountChoice {
  adesivo: boolean
  pontualidade: boolean
}

/**
 * Mensalidade final do plano conforme os descontos marcados.
 * Mesma regra do backend: adesivo e pontualidade se acumulam
 * (monthly × (1 − adesivo%) × 0,95).
 */
export function monthlyWithDiscounts(
  plan: PlanPricing,
  regras: QuoteCalculationResult['regras'],
  choice: DiscountChoice
): number {
  const adesivoPct = choice.adesivo && regras.elegivelAdesivo
    ? plan.percentualAdesivo ?? regras.percentualAdesivo
    : 0
  const pontualidade = choice.pontualidade ? 1 - regras.percentualPontualidade / 100 : 1
  return Math.round(plan.monthly * (1 - adesivoPct / 100) * pontualidade * 100) / 100
}
