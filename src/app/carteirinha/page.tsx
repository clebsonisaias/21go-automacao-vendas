'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  QrCode,
  Car,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Logo } from '@/components/home/SiteChrome'

function CarteirinhaContent() {
  const searchParams = useSearchParams()
  const nome = searchParams.get('nome') || 'ASSOCIADO 21GO'
  const placa = searchParams.get('placa') || 'RGL9B19'
  const veiculo = searchParams.get('veiculo') || 'VW GOL 1.0'
  const plano = searchParams.get('plano') || 'VIP COMPLETO'
  const contrato = searchParams.get('contrato') || '21GO-2026-9841'

  return (
    <div className="min-h-screen bg-navy-950 px-4 py-8 text-white sm:py-12">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo size={42} href="/" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-go-lime px-3 py-1 text-xs font-black text-navy-950">
            <CheckCircle2 className="h-3.5 w-3.5" />
            PROTEÇÃO ATIVA
          </span>
        </div>

        {/* Cartão Digital Wallet */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          {/* Efeito visual de brilho */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-go-orange/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-go-lime/15 blur-3xl" />

          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-go-lime">
                Cartão Virtual do Associado
              </span>
              <h2 className="m-0 mt-0.5 text-xl font-extrabold tracking-tight text-white">
                21Go Proteção Veicular
              </h2>
            </div>
            <ShieldCheck className="h-8 w-8 text-go-lime" />
          </div>

          <div className="my-5 flex flex-col gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-soft">Titular</span>
              <p className="m-0 text-base font-extrabold text-white uppercase">{nome}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-soft">Veículo</span>
                <p className="m-0 font-bold text-white">{veiculo}</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-soft">Placa</span>
                <p className="m-0 font-mono font-black text-go-orange">{placa}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
              <div>
                <span className="text-[11px] text-muted-soft">Plano</span>
                <p className="m-0 font-bold text-white">{plano}</p>
              </div>
              <div>
                <span className="text-[11px] text-muted-soft">Contrato SGA</span>
                <p className="m-0 font-mono text-muted-soft">{contrato}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs text-muted-soft">
            <span>Guincho 24h: 1.000 km</span>
            <span>Cobertura 100% FIPE</span>
          </div>
        </div>

        {/* Botões de Ação Rápida e Emergência */}
        <div className="flex flex-col gap-3">
          <a
            href="tel:08002345555"
            className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-red-600 px-6 text-base font-black text-white no-underline shadow-lg transition hover:bg-red-700 hover:scale-[1.01]"
          >
            <PhoneCall className="h-5 w-5 animate-pulse" />
            Ligar para Reboque 24h (0800 234 5555)
          </a>

          <a
            href="tel:08009418589"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white no-underline transition hover:bg-white/15"
          >
            <PhoneCall className="h-4 w-4" />
            Central de Suporte 21Go: 0800 941 8589
          </a>
        </div>

        <div className="text-center text-xs text-muted-soft">
          <p className="m-0">
            Apresente este cartão digital caso precise comprovar a cobertura do seu veículo.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CarteirinhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy-950 p-8 text-center text-white">
          Carregando cartão do associado…
        </div>
      }
    >
      <CarteirinhaContent />
    </Suspense>
  )
}
