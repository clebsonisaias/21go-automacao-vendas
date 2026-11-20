'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, ArrowLeft, Phone, Search, Star, Wrench, ShieldCheck } from 'lucide-react'
import { HinovaOficina } from '@/lib/hinova-api'

export default function ClienteOficinasPage() {
  const router = useRouter()
  const [oficinas, setOficinas] = useState<HinovaOficina[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('hinova_associado_token')
      if (!token) {
        router.push('/cliente')
        return
      }

      fetch('/api/cliente/oficinas', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.oficinas)) {
            setOficinas(data.oficinas)
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    } catch {
      router.push('/cliente')
    }
  }, [router])

  const filtered = oficinas.filter((o) => {
    const term = searchTerm.toLowerCase()
    return (
      o.nome.toLowerCase().includes(term) ||
      o.cidade.toLowerCase().includes(term) ||
      o.bairro.toLowerCase().includes(term) ||
      o.especialidade.toLowerCase().includes(term)
    )
  })

  return (
    <div className="min-h-screen bg-surface-50 text-navy-950">
      <header className="border-b border-line bg-white px-4 py-3.5 shadow-sm">
        <div className="mx-auto flex max-w-[900px] items-center justify-between">
          <Link
            href="/cliente/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-800 transition hover:text-go-orange"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao painel</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Rede de Oficinas Credenciadas
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-black text-navy-950">
              Oficinas e Centros de Reparo
            </h1>
            <p className="mt-1 text-xs text-muted">
              Oficinas homologadas com garantia de peças e mão de obra para reparos da 21Go.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cidade ou nome..."
              className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-xs text-navy-900 focus:border-navy-950 focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-line bg-white">
            <span className="text-xs font-bold text-muted">Carregando oficinas credenciadas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white p-8 text-center">
            <MapPin className="h-10 w-10 text-muted-soft" />
            <p className="text-sm font-bold text-navy-900">Nenhuma oficina encontrada</p>
            <p className="text-xs text-muted">Tente buscar por outra cidade ou bairro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((oficina) => (
              <div
                key={oficina.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${
                  oficina.destaque ? 'border-go-orange/60 ring-1 ring-go-orange/30' : 'border-line'
                }`}
              >
                {oficina.destaque && (
                  <span className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-go-orange px-2.5 py-0.5 text-[10px] font-black uppercase text-navy-950 shadow-sm">
                    <Star className="h-3 w-3 fill-navy-950" /> Destaque 21Go
                  </span>
                )}

                <div>
                  <h3 className="text-sm font-extrabold text-navy-900">{oficina.nome}</h3>
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-muted">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go-orange" />
                    <span>
                      {oficina.endereco} - {oficina.bairro}, {oficina.cidade}/{oficina.uf}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-2" />
                    <span className="font-semibold text-navy-800">{oficina.especialidade}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <a
                    href={`https://wa.me/558420182178?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20oficina%20credenciada%20${encodeURIComponent(oficina.nome)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-50 text-xs font-bold text-navy-900 transition hover:bg-surface-100"
                  >
                    <Phone className="h-3.5 w-3.5 text-go-whatsapp-dark" />
                    <span>{oficina.telefone}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
