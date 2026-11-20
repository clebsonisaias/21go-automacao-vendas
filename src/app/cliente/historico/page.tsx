'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, ArrowLeft, CheckCircle2, AlertCircle, FileText, Wrench } from 'lucide-react'
import { HinovaEvento } from '@/lib/hinova-api'

export default function ClienteHistoricoPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<HinovaEvento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('hinova_associado_token')
      if (!token) {
        router.push('/cliente')
        return
      }

      fetch('/api/cliente/historico', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.eventos)) {
            setEventos(data.eventos)
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    } catch {
      router.push('/cliente')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-surface-50 text-navy-950">
      <header className="border-b border-line bg-white px-4 py-3.5 shadow-sm">
        <div className="mx-auto flex max-w-[800px] items-center justify-between">
          <Link
            href="/cliente/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-800 transition hover:text-go-orange"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao painel</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Histórico de Chamados e Eventos
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-navy-950">
            Histórico do Associado
          </h1>
          <p className="mt-1 text-xs text-muted">
            Acompanhe o status de chamados de guincho, sinistros e manutenções registradas no SGA.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-line bg-white">
            <span className="text-xs font-bold text-muted">Carregando histórico...</span>
          </div>
        ) : eventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white p-8 text-center">
            <Clock className="h-10 w-10 text-muted-soft" />
            <p className="text-sm font-bold text-navy-900">Nenhum evento registrado</p>
            <p className="text-xs text-muted">Você ainda não precisou acionar socorro ou registrar sinistros.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {eventos.map((ev) => (
              <div
                key={ev.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-card transition hover:border-go-orange/40"
              >
                <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-go-orange">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-navy-900">{ev.tipo}</h3>
                      <span className="text-[11px] font-mono font-bold text-muted">Protocolo: {ev.protocolo}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> {ev.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-col justify-between gap-2 text-xs text-muted sm:flex-row sm:items-center">
                  <p className="text-navy-800">{ev.descricao}</p>
                  <span className="font-semibold text-muted-2 whitespace-nowrap">{ev.data}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
