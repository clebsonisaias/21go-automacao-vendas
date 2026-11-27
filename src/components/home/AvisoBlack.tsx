'use client'

import { useEffect, useState } from 'react'
import { promoDivulgada } from '@/lib/promo-adesao'

/**
 * Faixa da Black. Só aparece de 28/11 a 29/11 (a promo vale desde 27/11, mas não é divulgada no dia) (horário de Brasília) e com o Pix do site ligado,
 * as mesmas condições em que o cadastro baixa a adesão para R$ 1 (cadastro.ts). Sai sozinha à meia-noite de domingo.
 */
export function AvisoBlack({ pixLigado }: { pixLigado: boolean }) {
  const [ativa, setAtiva] = useState(false)
  useEffect(() => {
    const atualizar = () => setAtiva(promoDivulgada())
    atualizar()
    const t = setInterval(atualizar, 30_000)
    return () => clearInterval(t)
  }, [])
  if (!ativa || !pixLigado) return null
  return (
    <div role="status" className="bg-go-orange px-4 py-2.5 text-center text-sm font-semibold text-navy-950">
      Black 21Go prorrogada: adesão por R$ 1 até domingo (29/11). Faça a cotação pela placa e cadastre-se até 23h59 de domingo.
    </div>
  )
}
