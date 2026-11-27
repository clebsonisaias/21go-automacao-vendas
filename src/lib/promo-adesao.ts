/**
 * Promoção automática de adesão por R$ 1 por data (sem cupom): vale para o cadastro feito
 * de 27/11 a 29/11/2026 (horário de Brasília), até 23:59:59 do último dia. Depois disso a adesão volta ao normal sozinha.
 */
export const PROMO_ADESAO = { codigo: 'BLACK21GO', inicio: '2026-11-27', divulgacao: '2026-11-28', fim: '2026-11-29', valor: 1 } as const

const hojeBrasilia = (agora: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)

/** A promo vale desde 27/11, mas só é divulgada (faixa no site) a partir de 28/11, como prorrogação. */
export function promoDivulgada(agora = new Date()): boolean {
  const hoje = hojeBrasilia(agora)
  return hoje >= PROMO_ADESAO.divulgacao && hoje <= PROMO_ADESAO.fim
}

export function promoAdesaoAtiva(agora = new Date()): boolean {
  const hoje = hojeBrasilia(agora) // AAAA-MM-DD: comparação de texto é cronológica
  return hoje >= PROMO_ADESAO.inicio && hoje <= PROMO_ADESAO.fim
}

/** Fim da promoção (23:59:59 de Brasília do último dia), em ISO: guardado em quem cotou durante ela. */
export function fimDaPromo(): string {
  return new Date(`${PROMO_ADESAO.fim}T23:59:59.999-03:00`).toISOString()
}

/** Último dia da promoção como vai nos textos: domingo, 29/11. */
export function diaDaPromo(): string {
  const [, m, d] = PROMO_ADESAO.fim.split('-')
  return `domingo, ${d}/${m}`
}

/**
 * Como a promoção é anunciada em cada dia (decisão do Clebson, 27/11): no primeiro dia, "só hoje";
 * a partir da divulgação (28/11), "prorrogada até domingo". O desconto vale nos três dias.
 * `ate` e `dia` vão nos textos; `fimAnunciado` é o fim do prazo que o texto do dia promete.
 */
export function prazoDaPromo(agora = new Date()): { prorrogada: boolean; ate: string; dia: string; fimAnunciado: string } {
  if (hojeBrasilia(agora) >= PROMO_ADESAO.divulgacao) {
    return { prorrogada: true, ate: `até 23h59 de ${diaDaPromo()}`, dia: diaDaPromo(), fimAnunciado: fimDaPromo() }
  }
  const [, m, d] = PROMO_ADESAO.inicio.split('-')
  return {
    prorrogada: false,
    ate: `até 23h59 de hoje, ${d}/${m}`,
    dia: `hoje, ${d}/${m}`,
    fimAnunciado: new Date(`${PROMO_ADESAO.inicio}T23:59:59.999-03:00`).toISOString(),
  }
}

/** A Black vale só no Plano VIP (decisão do Clebson, 27/11): os outros planos seguem a adesão normal. */
export const PLANO_DA_PROMO = 'vip'

/** A adesão por R$ 1 vale para este plano agora? Só no VIP e só nos dias da promoção. */
export function promoNoPlano(planoId: string | undefined, agora = new Date()): boolean {
  return planoId === PLANO_DA_PROMO && promoAdesaoAtiva(agora)
}

/** Adesão com a promo: R$ 1, ou a própria adesão se ela já for menor que isso. */
export function adesaoPromo(ativacao: number): number {
  return Math.min(Math.max(0, ativacao), PROMO_ADESAO.valor)
}
