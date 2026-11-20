import type { ReactNode } from 'react'

function Bandeira() {
  return (
    <svg width="24" height="17" viewBox="0 0 24 17" aria-hidden="true" className="rounded-[2px]">
      <rect width="24" height="17" fill="#1AA34A" />
      <path d="M12 2.2 21.4 8.5 12 14.8 2.6 8.5Z" fill="#FFD400" />
      <circle cx="12" cy="8.5" r="3.4" fill="#17348F" />
    </svg>
  )
}

/** Moldura de placa Mercosul: faixa azul no topo e corpo branco. */
export function Plate({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`placa ${className}`}>
      <div className="placa-faixa" aria-hidden="true">
        <Bandeira />
        <span>BRASIL</span>
        <span className="!tracking-normal">BR</span>
      </div>
      {children}
    </div>
  )
}

/** Placa só para exibição (resumo do veículo). */
export function PlateStatic({ value }: { value: string }) {
  return (
    <Plate className="!shadow-[4px_4px_0_#0E1A3B] w-44 shrink-0">
      <p
        className="px-2 pb-1.5 pt-1 text-center font-display text-[2.1rem] font-semibold uppercase leading-none"
        style={{ letterSpacing: '0.1em' }}
        aria-label={`Placa ${value}`}
      >
        {value}
      </p>
    </Plate>
  )
}

/** Logo: uma mini placa com o nome da marca. */
export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className="inline-block overflow-hidden rounded-[5px] border-2 border-tinta bg-white leading-none"
        aria-hidden="true"
      >
        <span className="block h-1.5 bg-azul" />
        <span className="block px-1.5 pb-0.5 pt-px font-display text-[1.45rem] font-extrabold tracking-wide text-tinta">
          21GO
        </span>
      </span>
      <span className="hidden leading-tight sm:block">
        <span className={`block font-display text-xl font-bold ${onDark ? 'text-white' : 'text-tinta'}`}>
          Proteção veicular
        </span>
        <span className={`block text-xs font-medium ${onDark ? 'text-white/75' : 'text-tinta/80'}`}>
          Franquia autorizada 21Go
        </span>
      </span>
    </span>
  )
}
