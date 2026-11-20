import { PlanPricing, VehicleInfo } from './types'

// Coberturas oficiais de cada plano extraídas do bundle da 21Go
export const PLAN_FEATURES: Record<string, string[]> = {
  basico: [
    'Roubo e Furto 100% Tabela FIPE',
    'Rastreamento e Monitoramento 24h',
    'Assistência 24h (Guincho até 400km)',
    'Socorro Mecânico e Elétrico',
    'Chaveiro e Troca de Pneus',
  ],
  'do-seu-jeito': [
    'Roubo, Furto e Incêndio 100% FIPE',
    'Danos da Natureza (Alagamento/Granizo)',
    'Colisão e Perda Total 100% FIPE',
    'Assistência 24h (Guincho até 500km)',
    'Chaveiro e Socorro 24h',
  ],
  vip: [
    'Proteção Completa (Roubo, Furto, Colisão, PT, Fogo e Alagamento)',
    'Danos Materiais a Terceiros (R$ 50.000)',
    'Proteção de Vidros, Faróis e Lanternas',
    'Assistência 24h Ilimitada (Guincho até 800km)',
    'Carro Reserva 7 dias',
    'Hospedagem emergencial e táxi',
  ],
  premium: [
    'Tudo do Plano VIP com Cobertura Máxima',
    'Danos Materiais a Terceiros (R$ 100.000)',
    'Carro Reserva 15 dias',
    'Vidros, Retrovisores, Faróis e Teto Solar',
    'Guincho Ilimitado em todo o Brasil',
    'App com Telemetria e Assistência Prioritária',
  ],
  suv: [
    'Proteção Especializada para SUVs e Pick-ups',
    'Danos a Terceiros (R$ 75.000)',
    'Vidros e Faróis Completos',
    'Carro Reserva SUV 7 dias',
    'Assistência 24h VIP',
  ],
  'moto-400': [
    'Roubo, Furto e Colisão 100% FIPE',
    'Rastreador Dedicado de Alta Precisão',
    'Assistência 24h (Guincho até 400km)',
    'Socorro Chaveiro e Reboque',
  ],
  'moto-1000': [
    'Cobertura Completa para Motas de Alta Cilindrada',
    'Roubo, Furto, Colisão e Perda Total 100% FIPE',
    'Danos a Terceiros Opcional',
    'Guincho até 800km',
  ],
  especial: [
    'Cobertura Sob Medida para Veículos Especiais/Blindados',
    'Avaliação Personalizada e Monitoramento VIP',
    'Assistência Técnica Exclusiva',
  ],
}

/**
 * Checa se o veículo é elétrico ou híbrido (não elegível para desconto de adesivo)
 */
export function isElectricOrHybrid(vehicle: VehicleInfo): boolean {
  const marcasEletricas = ['BYD', 'TESLA', 'GWM', 'ZEEKR', 'NETA', 'ORA']
  if (marcasEletricas.some((m) => vehicle.marca.toUpperCase().includes(m))) {
    return true
  }
  const keywords = [
    'ELETRIC',
    'HIBRID',
    'HYBRID',
    'RECHARGE',
    'E-TECH',
    'E:HEV',
    'EV',
    'BEV',
    'HEV',
    'PHEV',
    'MHEV',
  ]
  const fullText = `${vehicle.marca} ${vehicle.modelo} ${vehicle.combustivel || ''}`.toUpperCase()
  return keywords.some((kw) => fullText.includes(kw))
}

/**
 * Checa se o veículo exige vistoria presencial na sede da 21Go
 */
export function requiresPresencialInspection(vehicle: VehicleInfo): boolean {
  const text = `${vehicle.marca} ${vehicle.modelo}`.toUpperCase()
  const patterns = [
    /AUDI/,
    /VOLVO/,
    /BYD.*202[3-6]/,
    /FOCUS.*AUT/,
    /JETTA.*TSI/,
    /BMW.*M/,
    /MERCEDES.*AMG/,
    /PORSCHE/,
  ]
  return patterns.some((regex) => regex.test(text))
}

/**
 * Calcula a taxa de ativação segundo a regra oficial da 21Go
 */
export function calculateActivationFee(
  vehicle: VehicleInfo,
  planMonthly: number,
  allPlans: { id: string; monthly: number }[]
): number {
  if (vehicle.marca.toUpperCase().includes('BYD')) {
    return 1550 // Fixo BYD
  }

  // Achar o primeiro plano prioritário disponível
  const priorityOrder = [
    'vip',
    'suv',
    'moto-1000',
    'moto-400',
    'especial',
    'premium',
    'do-seu-jeito',
    'basico',
  ]
  let priorityMonthly = planMonthly
  for (const pid of priorityOrder) {
    const found = allPlans.find((p) => p.id === pid)
    if (found) {
      priorityMonthly = found.monthly
      break
    }
  }

  // Math.max(Math.max(priorityPlanMonthly, selectedPlanMonthly) + 100, 249)
  const ativacao = Math.max(Math.max(priorityMonthly, planMonthly) + 100, 249)
  return Math.round(ativacao * 100) / 100
}

/**
 * Calcula os planos completos com todas as taxas e descontos aplicados
 */
export function enrichPlansWithRules(
  vehicle: VehicleInfo,
  rawPlans: { id: string; name: string; monthly: number; popular?: boolean }[]
): {
  plans: PlanPricing[]
  regras: {
    exigeVistoriaPresencial: boolean
    elegivelAdesivo: boolean
    percentualAdesivo: number
    percentualPontualidade: number
  }
} {
  const isMoto = vehicle.categoria?.toUpperCase().includes('MOTO') || false
  const isEV = isElectricOrHybrid(vehicle)
  const elegivelAdesivo = !isMoto && !isEV

  const exigeVistoriaPresencial = requiresPresencialInspection(vehicle)
  const percentualPontualidade = 5 // 5% de desconto pontualidade

  const plans: PlanPricing[] = rawPlans.map((raw) => {
    // Percentual de adesivo por plano/FIPE
    let percentualAdesivo = 0
    if (elegivelAdesivo) {
      if (['vip', 'suv', 'especial'].includes(raw.id)) {
        percentualAdesivo = vehicle.fipeValue > 30000 ? 15 : 10
      } else {
        percentualAdesivo = vehicle.fipeValue > 60000 ? 15 : 10
      }
    }

    const ativacao = calculateActivationFee(vehicle, raw.monthly, rawPlans)

    // Desconto de pontualidade (5%)
    const mensalidadeComPontualidade = Math.round(raw.monthly * 0.95 * 100) / 100

    // Desconto com adesivo cumulativo com pontualidade
    const descontoAdesivoFator = 1 - percentualAdesivo / 100
    const mensalidadeComAdesivo =
      Math.round(raw.monthly * descontoAdesivoFator * 0.95 * 100) / 100

    return {
      id: raw.id,
      name: raw.name,
      monthly: raw.monthly,
      popular: raw.popular || raw.id === 'vip',
      ativacao,
      percentualAdesivo,
      mensalidadeComPontualidade,
      mensalidadeComAdesivo,
      coberturas: PLAN_FEATURES[raw.id] || PLAN_FEATURES['basico'],
    }
  })

  // Percentual de adesivo de referência
  const percentualAdesivoReferencia = elegivelAdesivo
    ? vehicle.fipeValue > 30000
      ? 15
      : 10
    : 0

  return {
    plans,
    regras: {
      exigeVistoriaPresencial,
      elegivelAdesivo,
      percentualAdesivo: percentualAdesivoReferencia,
      percentualPontualidade,
    },
  }
}
