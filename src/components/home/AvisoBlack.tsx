'use client'

import { useEffect, useState } from 'react'
import { promoAdesaoAtiva } from '@/lib/promo-adesao'

/**
 * Faixa da Black. Só aparece no dia da promoção (horário de Brasília) e com o Pix do site ligado,
 * as mesmas condições em que o cadastro baixa a adesão para R$ 1 (cadastro.ts). Sai sozinha à meia-noite.
 */
export function AvisoBlack({ pixLigado }: { pixLigado: boolean }) {
  const [ativa, setAtiva] = useState(false)
  useEffect(() => {
    const atualizar = () => setAtiva(promoAdesaoAtiva())
    atualizar()
    const t = setInterval(atualizar, 30_000)
    return () => clearInterval(t)
  }, [])
  if (!ativa || !pixLigado) return null
  return (
    <div role="status" className="bg-go-orange px-4 py-2.5 text-center text-sm font-semibold text-navy-950">
      Black 21Go: adesão por R$ 1 só hoje. Faça a cotação pela placa e cadastre-se hoje, até 23h59.
    </div>
  )
}
