'use client'

import React from 'react'
import { TrendingDown, ShieldCheck, Check, X, Sparkles } from 'lucide-react'
import { brl } from '@/lib/site'

interface EconomizometroProps {
  fipeValue: number
  mensalidade21Go: number
  ativacao21Go: number
  veiculoNome: string
}

export function Economizometro({
  fipeValue,
  mensalidade21Go,
  ativacao21Go,
  veiculoNome,
}: EconomizometroProps) {
  // Seguro tradicional custa em média entre 5.5% e 7% da FIPE ao ano para veículos comuns
  const taxaAnualSeguroTradicional = Math.max(2400, fipeValue * 0.062)
  const custoAnual21Go = mensalidade21Go * 12 + ativacao21Go
  const economiaAnual = Math.max(0, taxaAnualSeguroTradicional - custoAnual21Go)

  return (
    <div className="flex flex-col gap-5 rounded-2xl border-2 border-go-lime bg-[#fbfdf2] p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-go-lime text-navy-950">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-go-lime-dark">
              Economizômetro Inteligente
            </span>
            <h3 className="m-0 text-xl font-extrabold text-navy-800">
              21Go vs Seguradora Tradicional
            </h3>
          </div>
        </div>

        <div className="rounded-xl bg-go-orange/15 px-3.5 py-1.5 text-xs font-bold text-go-orange-dark">
          Economia de até {Math.round((economiaAnual / taxaAnualSeguroTradicional) * 100)}%
        </div>
      </div>

      <p className="m-0 text-sm text-muted">
        Estimativa comparativa anual para proteger seu <strong>{veiculoNome}</strong>:
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Card Seguradora Tradicional */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-muted">Seguradoras de Mercado</span>
            <span className="text-xs text-muted">Estimativa média de mercado tradicional</span>
            <p className="m-0 mt-2 text-2xl font-extrabold text-navy-800">
              ~{brl(taxaAnualSeguroTradicional)}
              <span className="text-xs font-normal text-muted">/ano</span>
            </p>
          </div>

          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 text-xs text-muted">
            <li className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4 shrink-0 text-red-600" />
              Restrições por análise de perfil, CEP e idade
            </li>
            <li className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4 shrink-0 text-red-600" />
              Consulta de score de crédito e restrições
            </li>
            <li className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4 shrink-0 text-red-600" />
              Franquia de colisão frequentemente elevada
            </li>
          </ul>
        </div>

        {/* Card 21Go Proteção */}
        <div className="relative flex flex-col justify-between rounded-xl border-2 border-go-lime bg-white p-4 shadow-sm">
          <span className="absolute -top-3 right-4 rounded-full bg-go-lime px-3 py-0.5 text-[11px] font-black uppercase text-navy-950">
            Mais Econômico
          </span>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-go-lime-dark">21Go Proteção Veicular</span>
            <span className="text-xs text-muted">Termo de adesão sem burocracia</span>
            <p className="m-0 mt-2 text-2xl font-extrabold text-navy-800">
              {brl(custoAnual21Go)}
              <span className="text-xs font-normal text-muted">/ano (com adesão)</span>
            </p>
          </div>

          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 text-xs font-semibold text-navy-800">
            <li className="flex items-center gap-2 text-go-lime-dark">
              <Check className="h-4 w-4 shrink-0 text-go-lime-dark" />
              Sem restrição de perfil de condutor habilitado
            </li>
            <li className="flex items-center gap-2 text-go-lime-dark">
              <Check className="h-4 w-4 shrink-0 text-go-lime-dark" />
              Sem consulta restritiva ao SPC/Serasa
            </li>
            <li className="flex items-center gap-2 text-go-lime-dark">
              <Check className="h-4 w-4 shrink-0 text-go-lime-dark" />
              Guincho até 1.000 km e assistência 24h
            </li>
          </ul>
        </div>
      </div>

      {economiaAnual > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-go-lime/30 p-3.5 text-navy-950">
          <div className="flex items-center gap-2 font-extrabold text-sm">
            <Sparkles className="h-4 w-4 text-go-orange-dark" />
            <span>Sua economia anual estimada com a 21Go:</span>
          </div>
          <span className="text-lg font-black text-go-lime-dark">
            +{brl(economiaAnual)} de economia
          </span>
        </div>
      )}

      <p className="m-0 text-[11px] text-muted leading-tight">
        * Simulação comparativa meramente ilustrativa com base em estimativas de mercado. A 21Go opera no regime de proteção patrimonial mútua (LC nº 213/2025), não se tratando de contrato de seguro privado tradicional.
      </p>
    </div>
  )
}
