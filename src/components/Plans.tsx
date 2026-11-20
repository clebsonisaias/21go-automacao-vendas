import type { RefObject } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { PlanPricing, QuoteCalculationResult } from '@/lib/types'
import { formatBRL, formatNumber, monthlyWithDiscounts } from '@/lib/format'
import { PlateStatic } from './Plate'

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="mt-[3px] shrink-0">
      <path d="M2.5 8.5 6.4 12.3 13.5 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  )
}

function adesivoLabel(quote: QuoteCalculationResult): string {
  const pcts = quote.plans
    .map((p) => p.percentualAdesivo ?? quote.regras.percentualAdesivo)
    .filter((n) => n > 0)
  if (!pcts.length) return `−${quote.regras.percentualAdesivo}%`
  const min = Math.min(...pcts)
  const max = Math.max(...pcts)
  return min === max ? `−${min}%` : `−${min}% a −${max}%`
}

export function Plans({
  quote,
  plate,
  comAdesivo,
  comPontualidade,
  onAdesivo,
  onPontualidade,
  onChoose,
  headingRef,
}: {
  quote: QuoteCalculationResult
  plate: string
  comAdesivo: boolean
  comPontualidade: boolean
  onAdesivo: (v: boolean) => void
  onPontualidade: (v: boolean) => void
  onChoose: (plan: PlanPricing) => void
  headingRef: RefObject<HTMLHeadingElement>
}) {
  const { vehicle, regras } = quote

  return (
    <section id="planos" aria-labelledby="planos-titulo" className="scroll-mt-4 px-5 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {plate && <PlateStatic value={plate} />}
          <div>
            <h2
              id="planos-titulo"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-none outline-none"
            >
              Planos para {vehicle.marca} {vehicle.modelo}
            </h2>
            <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-1 text-base">
              <div className="flex gap-1.5">
                <dt className="text-tinta/75">Ano</dt>
                <dd className="font-semibold">{vehicle.ano}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-tinta/75">Tabela FIPE</dt>
                <dd className="font-semibold">{formatBRL(vehicle.fipeValue)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-tinta/75">Código FIPE</dt>
                <dd className="font-semibold">{vehicle.fipeCode}</dd>
              </div>
            </dl>
          </div>
        </div>

        <fieldset className="mt-9 flex flex-col gap-3 sm:flex-row">
          <legend className="mb-3 font-display text-xl font-bold">Descontos na mensalidade</legend>
          {regras.elegivelAdesivo && (
            <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-md border-2 border-tinta/20 bg-white p-4 has-[:checked]:border-azul">
              <input
                type="checkbox"
                checked={comAdesivo}
                onChange={(e) => onAdesivo(e.target.checked)}
                className="mt-1 h-5 w-5 accent-azul"
              />
              <span>
                <span className="block font-semibold">Adesivo da 21Go no vidro traseiro: {adesivoLabel(quote)}</span>
                <span className="block text-sm text-tinta/75">Vale enquanto o adesivo estiver no veículo.</span>
              </span>
            </label>
          )}
          <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-md border-2 border-tinta/20 bg-white p-4 has-[:checked]:border-azul">
            <input
              type="checkbox"
              checked={comPontualidade}
              onChange={(e) => onPontualidade(e.target.checked)}
              className="mt-1 h-5 w-5 accent-azul"
            />
            <span>
              <span className="block font-semibold">Pontualidade: −{regras.percentualPontualidade}%</span>
              <span className="block text-sm text-tinta/75">Para quem paga até o dia do vencimento.</span>
            </span>
          </label>
        </fieldset>

        {regras.exigeVistoriaPresencial && (
          <div
            role="note"
            className="mt-6 flex items-start gap-3 rounded-md border-l-4 border-cone-dark bg-white px-4 py-3"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-cone-dark" aria-hidden="true" />
            <p>
              <strong>Este modelo exige vistoria presencial</strong> na sede da 21Go, depois do envio dos dados.
            </p>
          </div>
        )}

        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {quote.plans.map((plan) => {
            const price = monthlyWithDiscounts(plan, regras, { adesivo: comAdesivo, pontualidade: comPontualidade })
            const discounted = price < plan.monthly
            const popular = !!plan.popular

            return (
              <li
                key={plan.id}
                className={`relative flex flex-col rounded-lg border-2 p-6 ${
                  popular
                    ? 'border-tinta bg-azul text-white shadow-[6px_6px_0_#0E1A3B]'
                    : 'border-tinta/20 bg-white'
                }`}
              >
                {popular && (
                  <span className="absolute -top-4 left-5 rounded bg-cone px-3 py-1 font-display text-lg font-bold leading-none text-tinta">
                    Mais escolhido
                  </span>
                )}

                <h3 className="font-display text-3xl font-bold">{plan.name}</h3>

                <div className="mt-4">
                  <p className={`text-sm ${popular ? 'text-white/80' : 'text-tinta/75'} ${discounted ? '' : 'invisible'}`}>
                    de <s>{formatBRL(plan.monthly)}</s> por mês
                  </p>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold">R$</span>
                    <span className="font-display text-[3.6rem] font-bold leading-none tabular-nums">
                      {formatNumber(price)}
                    </span>
                    <span className={popular ? 'text-white/80' : 'text-tinta/75'}>/mês</span>
                  </p>
                  <p className={`mt-2 text-sm ${popular ? 'text-white/85' : 'text-tinta/80'}`}>
                    Taxa de ativação no Pix: <strong className="font-semibold">{formatBRL(plan.ativacao)}</strong>
                  </p>
                </div>

                <div className={`mt-5 flex-1 border-t pt-4 ${popular ? 'border-white/25' : 'border-tinta/15'}`}>
                  <h4 className="font-display text-lg font-bold">O plano inclui</h4>
                  <ul className="mt-2.5 space-y-2 text-[0.95rem] leading-snug">
                    {plan.coberturas.map((c) => (
                      <li key={c} className="flex gap-2.5">
                        <CheckIcon />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onChoose(plan)}
                  className={`btn mt-7 w-full ${
                    popular ? 'bg-cone text-tinta hover:bg-white' : 'bg-tinta text-white hover:bg-azul-dark'
                  }`}
                >
                  Contratar plano {plan.name}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
