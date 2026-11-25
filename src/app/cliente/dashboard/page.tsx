'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SimboloLogo } from '@/components/Marca'
import Link from 'next/link'
import {
  ShieldCheck,
  Car,
  Wrench,
  FileText,
  CreditCard,
  Clock,
  PhoneCall,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { HinovaAssociadoDados, HinovaVeiculo } from '@/lib/hinova-api'

export default function ClienteDashboardPage() {
  const router = useRouter()
  const [associado, setAssociado] = useState<HinovaAssociadoDados | null>(null)
  const [selectedVeiculo, setSelectedVeiculo] = useState<HinovaVeiculo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('hinova_associado_token')
      const storedData = localStorage.getItem('hinova_associado_dados')

      if (!token) {
        router.push('/cliente')
        return
      }

      if (storedData) {
        try {
          const parsed = JSON.parse(storedData) as HinovaAssociadoDados
          setAssociado(parsed)
          if (parsed.veiculos && parsed.veiculos.length > 0) {
            setSelectedVeiculo(parsed.veiculos[0])
          }
        } catch {}
      }

      // Atualiza os dados via API interna
      fetch('/api/cliente/dados', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.associado) {
            setAssociado(data.associado)
            if (data.associado.veiculos?.length > 0) {
              setSelectedVeiculo(data.associado.veiculos[0])
            }
            localStorage.setItem('hinova_associado_dados', JSON.stringify(data.associado))
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    } catch {
      router.push('/cliente')
    }
  }, [router])

  const handleLogout = () => {
    try {
      localStorage.removeItem('hinova_associado_token')
      localStorage.removeItem('hinova_associado_dados')
    } finally {
      router.push('/cliente')
    }
  }

  if (isLoading && !associado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-go-orange border-t-transparent" />
          <p className="text-sm font-bold text-muted-soft">Carregando seus dados na 21Go...</p>
        </div>
      </div>
    )
  }

  const veiculo = selectedVeiculo || associado?.veiculos?.[0]

  return (
    <div className="min-h-screen bg-surface-50 text-navy-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-navy-800 bg-navy-950 px-4 py-3.5 text-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/cliente/dashboard" className="flex items-center gap-2.5">
              <SimboloLogo lado={40} />
              <div>
                <span className="block font-heading text-lg font-black uppercase tracking-tight text-white">
                  21Go
                </span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-go-lime">
                  Portal do Associado
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <span className="block text-xs font-bold text-white">{associado?.nome}</span>
              <span className="block text-[11px] text-muted-soft">CPF: {associado?.cpf}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
              title="Sair da conta"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-8">
        {/* Welcome & Status Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-navy-800 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 p-6 text-white shadow-xl md:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-go-orange/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-20 h-56 w-56 rounded-full bg-go-lime/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Proteção Ativa
                </span>
                <span className="text-xs text-muted-soft">Matrícula SGA: #{associado?.codigoAssociado || '21084'}</span>
              </div>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">
                Olá, {associado?.nome?.split(' ')[0]}!
              </h1>
              <p className="mt-1 text-xs text-muted-soft md:text-sm">
                Seu veículo está totalmente protegido com socorro mútuo 24h e assistência nacional 21Go.
              </p>
            </div>

            {/* Quick Emergency Button */}
            <Link
              href="/cliente/assistencia"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-go-orange to-amber-500 px-6 text-sm font-extrabold text-navy-950 shadow-cta transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Chamar Guincho 24h</span>
            </Link>
          </div>
        </div>

        {/* Card do Veículo Protegido */}
        {veiculo && (
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-go-orange">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Veículo Cadastrado</span>
                  <h2 className="text-lg font-extrabold text-navy-900">
                    {veiculo.marca} {veiculo.modelo}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="rounded-lg border border-navy-900 bg-navy-950 px-3 py-1 font-mono text-sm font-black text-white shadow-sm">
                    {veiculo.placa}
                  </span>
                  <span className="mt-1 text-[11px] font-semibold text-emerald-600">Contrato: {veiculo.numeroContrato || '21GO-88419'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-xl bg-surface-50 p-3">
                <span className="text-muted block">Ano Modelo</span>
                <span className="font-bold text-navy-900">{veiculo.anoModelo || 2023}</span>
              </div>
              <div className="rounded-xl bg-surface-50 p-3">
                <span className="text-muted block">Cor</span>
                <span className="font-bold text-navy-900">{veiculo.cor || 'Branca'}</span>
              </div>
              <div className="rounded-xl bg-surface-50 p-3">
                <span className="text-muted block">Chassi</span>
                <span className="font-bold font-mono text-navy-900 truncate block">{veiculo.chassi || '9BWAA05U8BP012345'}</span>
              </div>
              <div className="rounded-xl bg-surface-50 p-3">
                <span className="text-muted block">Cobertura</span>
                <span className="font-bold text-emerald-600">100% FIPE Integral</span>
              </div>
            </div>
          </div>
        )}

        {/* Grid de Atalhos Principais (Central do Cliente) */}
        <div>
          <h3 className="mb-4 text-base font-extrabold text-navy-900">
            Serviços e Autoatendimento
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Solicitar Assistência 24h */}
            <Link
              href="/cliente/assistencia"
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-go-orange hover:shadow-lg"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-go-orange group-hover:bg-go-orange group-hover:text-white transition">
                  <Wrench className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-base font-bold text-navy-900">
                  Assistência 24 Horas
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Solicite guincho, socorro para bateria descarregada, chaveiro ou troca de estepe em tempo real.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-go-orange">
                <span>Abrir chamado</span>
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* 2. 2ª Via de Boleto */}
            <a
              href="https://wa.me/558420182178?text=Ol%C3%A1%2C%20gostaria%20da%20segunda%20via%20do%20meu%20boleto%2021Go."
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-base font-bold text-navy-900">
                  2ª Via de Boletos & PIX
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Consulte mensalidades em aberto, linha digitável e código PIX copia e cola sem complicação.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600">
                <span>Emitir 2ª via</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </a>

            {/* 3. Carteirinha Digital PWA */}
            <Link
              href="/carteirinha"
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-navy-700 hover:shadow-lg"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-800 group-hover:bg-navy-950 group-hover:text-white transition">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-base font-bold text-navy-900">
                  Carteirinha Digital
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Acesse sua credencial virtual oficial de associado 21Go para salvar no celular e usar offline.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-navy-800">
                <span>Visualizar carteirinha</span>
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* 4. Rede de Oficinas Credenciadas */}
            <Link
              href="/cliente/oficinas"
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                  <MapPin className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-base font-bold text-navy-900">
                  Oficinas Credenciadas
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Encontre oficinas parceiras recomendadas para reparos de funilaria, pintura, vidros e mecânica.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">
                <span>Ver oficinas</span>
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* 5. Histórico de Ocorrências & Eventos */}
            <Link
              href="/cliente/historico"
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-purple-500 hover:shadow-lg"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-base font-bold text-navy-900">
                  Histórico de Chamados
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Acompanhe os protocolos de assistência 24h e sinistros registrados para o seu veículo.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-600">
                <span>Ver histórico</span>
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* 6. Plantão Telefônico e WhatsApp */}
            <a
              href="https://wa.me/558420182178?text=Ol%C3%A1%2C%20preciso%20de%20atendimento%20da%20Central%2021Go."
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-go-whatsapp hover:shadow-lg"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-go-whatsapp-dark group-hover:bg-go-whatsapp group-hover:text-white transition">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-base font-bold text-navy-900">
                  Central de Atendimento
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Fale diretamente com nossa equipe no WhatsApp da CITmax, consultor autorizado 21Go: (84) 2018-2178.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-go-whatsapp-dark">
                <span>Chamar no WhatsApp</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
