/**
 * Promoção automática de adesão por R$ 1 por data (sem cupom): vale para o cadastro feito
 * no dia (horário de Brasília), até 23:59:59. Passou o dia, a adesão volta ao normal sozinha.
 */
export const PROMO_ADESAO = { codigo: 'BLACK21GO', dia: '2026-11-27', valor: 1 } as const

const hojeBrasilia = (agora: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)

export function promoAdesaoAtiva(agora = new Date()): boolean {
  return hojeBrasilia(agora) === PROMO_ADESAO.dia
}

/** Fim da promoção (23:59:59 de Brasília do dia), em ISO: guardado em quem cotou durante ela. */
export function fimDaPromo(): string {
  return new Date(`${PROMO_ADESAO.dia}T23:59:59.999-03:00`).toISOString()
}

/** Dia da promoção como vai nos textos: 27/11. */
export function diaDaPromo(): string {
  const [, m, d] = PROMO_ADESAO.dia.split('-')
  return `${d}/${m}`
}

/** Adesão com a promo: R$ 1, ou a própria adesão se ela já for menor que isso. */
export function adesaoPromo(ativacao: number): number {
  return Math.min(Math.max(0, ativacao), PROMO_ADESAO.valor)
}
