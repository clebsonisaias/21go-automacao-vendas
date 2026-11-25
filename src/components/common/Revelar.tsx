'use client'

import React, { useEffect, useRef } from 'react'

/**
 * Bloco que aparece com um fade curto quando chega na tela (uma vez só). O estado escondido só
 * vale com a classe `anima` no <html> (script do layout) e sem "reduzir movimento"
 * (globals.css): sem JavaScript ou com menos movimento, o conteúdo aparece direto.
 */
export function Revelar({
  className = '',
  atraso = 0,
  children,
}: {
  className?: string
  /** Atraso em ms, para blocos em sequência (ex.: título 0, grade 60). */
  atraso?: number
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.dataset.revelar = '1'
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.setAttribute('data-visivel', '')
      return
    }
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          el.setAttribute('data-visivel', '')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`revelar ${className}`} style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}>
      {children}
    </div>
  )
}
