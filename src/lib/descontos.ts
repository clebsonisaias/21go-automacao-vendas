/**
 * Descontos da mensalidade, iguais para os planos do CRM e para o VIP da tabela regional (decisão
 * do Clebson, 25/11/2026: o valor da tabela é o valor normal; pagamento em dia e adesivo entram por
 * cima). O de pagamento em dia (5%) só vale para a mensalidade paga até o vencimento; o do adesivo
 * 21Go no vidro é cumulativo com ele.
 *
 * Funções puras, sem imports (testadas com `node --test`).
 */

export const PERCENTUAL_PONTUALIDADE = 5

/** Planos com a faixa de adesivo mais generosa (15% a partir de R$ 30 mil de FIPE). */
const PLANOS_ADESIVO_CEDO = ['vip', 'suv', 'especial']

/** Percentual do adesivo por plano e FIPE. Moto, elétrico e híbrido não têm (elegivel = false). */
export function percentualAdesivo(planoId: string, fipe: number, elegivel: boolean): number {
  if (!elegivel) return 0
  const corte = PLANOS_ADESIVO_CEDO.includes(planoId) ? 30000 : 60000
  return fipe > corte ? 15 : 10
}

const centavos = (v: number) => Math.round(v * 100) / 100

/** Mensalidade pagando em dia e com adesivo (cumulativo), a partir do valor normal. */
export function mensalidadesComDescontos(normal: number, percAdesivo: number): { pontualidade: number; adesivo: number } {
  const fatorPontualidade = 0.95 // 1 − PERCENTUAL_PONTUALIDADE / 100, escrito igual ao cálculo de sempre
  return {
    pontualidade: centavos(normal * fatorPontualidade),
    adesivo: centavos(normal * (1 - percAdesivo / 100) * fatorPontualidade),
  }
}

export type EscolhaDesconto = 'adesivo' | 'pontualidade' | 'normal'

/**
 * Qual mensalidade o cliente escolheu, pelo valor gravado. O adesivo só conta quando é de fato
 * menor que o de pagamento em dia (sem adesivo elegível os dois valores são iguais).
 */
export function escolhaDeDesconto(
  valor: number,
  opcoes: { normal: number; pontualidade: number; adesivo: number }
): EscolhaDesconto | null {
  const igual = (a: number, b: number) => Math.abs(a - b) < 0.005
  if (opcoes.adesivo < opcoes.pontualidade && igual(valor, opcoes.adesivo)) return 'adesivo'
  if (igual(valor, opcoes.pontualidade)) return 'pontualidade'
  if (igual(valor, opcoes.normal)) return 'normal'
  return null
}

/** O valor de uma escolha numa tabela de opções. */
export function valorDaEscolha(
  escolha: EscolhaDesconto,
  opcoes: { normal: number; pontualidade: number; adesivo: number }
): number {
  return escolha === 'adesivo' ? opcoes.adesivo : escolha === 'pontualidade' ? opcoes.pontualidade : opcoes.normal
}
