import React from 'react'

/**
 * Dica para botões só com ícone: aparece no hover e no foco do teclado.
 * O texto deve ser igual ao aria-label do botão. `kbd` mostra o atalho, se houver.
 */
export function Tooltip({
  label,
  kbd,
  side = 'bottom',
  children,
}: {
  label: string
  kbd?: string
  side?: 'bottom' | 'left'
  children: React.ReactNode
}) {
  const pos =
    side === 'left'
      ? 'right-full top-1/2 mr-2 -translate-y-1/2'
      : 'left-1/2 top-full mt-2 -translate-x-1/2'
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-30 hidden whitespace-nowrap rounded-md bg-navy-900 px-2 py-1 text-xs font-medium text-white group-hover/tt:block group-focus-within/tt:block ${pos}`}
      >
        {label}
        {kbd && <kbd className="ml-2 rounded border border-navy-600 px-1 text-[12px] font-normal text-muted-soft">{kbd}</kbd>}
      </span>
    </span>
  )
}
