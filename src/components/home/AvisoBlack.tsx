'use client'

import { useEffect, useState } from 'react'
import { prazoDaPromo, promoAdesaoAtiva } from '@/lib/promo-adesao'

/**
 * Faixa da Black, com o Pix do site ligado, nas mesmas condições em que o cadastro baixa a adesão para
 * R$ 1 (cadastro.ts). Em 27/11 diz "só hoje"; de 28/11 a 29/11, "prorrogada até domingo" (decisão do
 * Clebson, 27/11). Sai sozinha à meia-noite de domingo.
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
      {prazoDaPromo().prorrogada
        ? 'Black 21Go prorrogada: adesão por R$ 1 no Plano VIP até domingo (29/11). Faça a cotação pela placa e cadastre-se até 23h59 de domingo.'
        : 'Black 21Go: adesão por R$ 1 no Plano VIP, só hoje. Faça a cotação pela placa e cadastre-se até 23h59.'}
    </div>
  )
}
