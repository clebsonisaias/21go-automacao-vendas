/**
 * Promoção automática de adesão por R$ 1 por data (sem cupom): vale para o cadastro feito
 * no dia (horário de Brasília), até 23:59:59. Passou o dia, a adesão volta ao normal sozinha.
 */
export const PROMO_ADESAO = { codigo: 'BLACK21GO', dia: '2026-11-27', valor: 1 } as const

const hojeBrasilia = (agora: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)

export function promoAdesaoAtiva(agora = new Date()): boolean {
  return hojeBrasilia(agora) === PROMO_ADESAO.dia
}

/** Adesão com a promo: R$ 1, ou a própria adesão se ela já for menor que isso. */
export function adesaoPromo(ativacao: number): number {
  return Math.min(Math.max(0, ativacao), PROMO_ADESAO.valor)
}
