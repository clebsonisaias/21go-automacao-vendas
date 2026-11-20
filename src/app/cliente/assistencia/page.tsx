'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wrench,
  Truck,
  BatteryCharging,
  Fuel,
  Key,
  Disc,
  AlertOctagon,
  ArrowLeft,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  PhoneCall,
  Navigation,
  FileText,
} from 'lucide-react'
import { HinovaAssociadoDados } from '@/lib/hinova-api'

const SERVICOS = [
  { id: 'guincho', label: 'Guincho / Reboque', desc: 'Pane mecânica ou acidente que impossibilite rodar', icon: Truck },
  { id: 'bateria', label: 'Bateria / Pane Elétrica', desc: 'Carro não liga, necessita de recarga/auxiliar', icon: BatteryCharging },
  { id: 'troca_pneu', label: 'Troca de Pneu', desc: 'Auxílio com estepe furado ou danificado', icon: Disc },
  { id: 'chaveiro', label: 'Chaveiro 24 Horas', desc: 'Chave trancada dentro do carro ou extraviada', icon: Key },
  { id: 'pane_seca', label: 'Falta de Combustível', desc: 'Socorro emergencial com combustível até o posto', icon: Fuel },
  { id: 'colisao', label: 'Colisão / Sinistro', desc: 'Acidente de trânsito ou abalroamento', icon: AlertOctagon },
] as const

type TipoServico = typeof SERVICOS[number]['id']

export default function ClienteAssistenciaPage() {
  const router = useRouter()
  const [associado, setAssociado] = useState<HinovaAssociadoDados | null>(null)
  const [tipoServico, setTipoServico] = useState<TipoServico>('guincho')
  const [placa, setPlaca] = useState('')
  const [telefone, setTelefone] = useState('')
  const [enderecoOrigem, setEnderecoOrigem] = useState('')
  const [enderecoDestino, setEnderecoDestino] = useState('')
  const [descricao, setDescricao] = useState('')
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({})
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState<{ protocolo: string; mensagem: string } | null>(null)

  useEffect(() => {
    try {
      const token = localStorage.getItem('hinova_associado_token')
      const stored = localStorage.getItem('hinova_associado_dados')

      if (!token) {
        router.push('/cliente')
        return
      }

      if (stored) {
        const parsed = JSON.parse(stored) as HinovaAssociadoDados
        setAssociado(parsed)
        if (parsed.telefone) setTelefone(parsed.telefone)
        if (parsed.veiculos && parsed.veiculos.length > 0) {
          setPlaca(parsed.veiculos[0].placa)
        }
      }
    } catch {
      router.push('/cliente')
    }
  }, [router])

  // Obter geolocalização do navegador
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no seu navegador.')
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ latitude: lat, longitude: lng })
        setEnderecoOrigem(`Localização GPS: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`)
        setIsGettingLocation(false)
      },
      (err) => {
        console.warn('Erro ao obter localização:', err)
        setIsGettingLocation(false)
        alert('Não foi possível obter a localização exata. Por favor, digite o endereço ou ponto de referência.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('hinova_associado_token') || ''
      const res = await fetch('/api/cliente/assistencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipoServico,
          placa: placa.toUpperCase(),
          telefoneContato: telefone,
          enderecoOrigem,
          enderecoDestino: tipoServico === 'guincho' ? enderecoDestino : '',
          descricao,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccessResult({
          protocolo: data.protocolo || `21GO-${new Date().getFullYear()}-001`,
          mensagem: data.mensagem || 'Chamado registrado com sucesso!',
        })
      } else {
        setError(data.error || 'Erro ao registrar solicitação de assistência.')
      }
    } catch {
      setError('Erro de conexão ao enviar chamado. Tente novamente ou ligue no suporte.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 text-navy-950">
      {/* Top Header */}
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
            Solicitação de Assistência 24h
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-4 py-8">
        {/* Tela de Sucesso */}
        {successResult ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-white p-8 text-center shadow-card animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Chamado Operacional Aberto
            </span>

            <h1 className="mt-2 text-2xl font-black text-navy-950">
              Socorro Solicitado com Sucesso!
            </h1>

            <div className="mx-auto my-6 max-w-md rounded-2xl border border-line bg-surface-50 p-5 text-left">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Protocolo SGA</span>
                <span className="font-mono text-base font-black text-navy-950">{successResult.protocolo}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted block">Placa:</span>
                  <span className="font-bold text-navy-900">{placa.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-muted block">Serviço:</span>
                  <span className="font-bold text-navy-900">
                    {SERVICOS.find((s) => s.id === tipoServico)?.label}
                  </span>
                </div>
                <div className="col-span-2 mt-2">
                  <span className="text-muted block">Local de Atendimento:</span>
                  <span className="font-semibold text-navy-900">{enderecoOrigem}</span>
                </div>
              </div>
            </div>

            <p className="mx-auto max-w-md text-xs text-muted leading-relaxed">
              {successResult.mensagem} O prestador mais próximo foi acionado e entrará em contato pelo telefone{' '}
              <strong className="text-navy-900">{telefone}</strong>.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={`https://wa.me/558420182178?text=Ol%C3%A1%2C%20acabei%20de%20abrir%20o%20chamado%20de%20assist%C3%AAncia%20protocolo%20${encodeURIComponent(successResult.protocolo)}%20para%20o%20ve%C3%ADculo%20${encodeURIComponent(placa)}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-go-whatsapp-dark px-5 text-xs font-bold text-white transition hover:bg-go-whatsapp"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Acompanhar no WhatsApp 24h</span>
              </a>

              <Link
                href="/cliente/dashboard"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-xs font-bold text-navy-800 transition hover:bg-surface-100"
              >
                <span>Voltar ao Início</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Formulário de Abertura */
          <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-go-orange">
                  <Wrench className="h-4 w-4" />
                </span>
                <h1 className="text-xl font-black text-navy-950">
                  Solicitar Assistência Emergencial 24h
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted">
                Preencha os dados do local onde o veículo se encontra para envio imediato do socorro.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* 1. Escolha do Serviço */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">
                  1. Qual o tipo de assistência você precisa?
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SERVICOS.map((serv) => {
                    const Icon = serv.icon
                    const isSelected = tipoServico === serv.id
                    return (
                      <button
                        key={serv.id}
                        type="button"
                        onClick={() => setTipoServico(serv.id)}
                        className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-go-orange bg-orange-50/50 shadow-sm ring-1 ring-go-orange'
                            : 'border-line bg-white hover:border-line-dark hover:bg-surface-50'
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isSelected ? 'bg-go-orange text-navy-950' : 'bg-surface-100 text-muted'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-navy-950">{serv.label}</span>
                          <span className="block text-[11px] text-muted leading-relaxed">{serv.desc}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Placa e Telefone */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    required
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    placeholder="ABC1D23"
                    className="w-full rounded-xl border border-line bg-surface-50 px-4 py-2.5 font-mono text-sm font-bold text-navy-900 uppercase focus:border-navy-950 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Telefone de Contato (WhatsApp)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(84) 99999-9999"
                      className="w-full rounded-xl border border-line bg-surface-50 py-2.5 pl-10 pr-4 text-sm text-navy-900 focus:border-navy-950 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Onde o veículo está parado */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                    Endereço ou Ponto onde o carro está
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-go-orange hover:underline disabled:opacity-50"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>{isGettingLocation ? 'Obtendo GPS...' : 'Usar minha localização GPS'}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={enderecoOrigem}
                    onChange={(e) => setEnderecoOrigem(e.target.value)}
                    placeholder="Ex: Av. Engenheiro Roberto Freire, em frente ao shopping, Natal/RN"
                    className="w-full rounded-xl border border-line bg-surface-50 py-2.5 pl-10 pr-4 text-sm text-navy-900 focus:border-navy-950 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Endereço de Destino (se for Guincho) */}
              {tipoServico === 'guincho' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Endereço de Destino (Para onde levar o veículo)
                  </label>
                  <input
                    type="text"
                    value={enderecoDestino}
                    onChange={(e) => setEnderecoDestino(e.target.value)}
                    placeholder="Ex: Minha residência ou Oficina Credenciada 21Go em Natal"
                    className="w-full rounded-xl border border-line bg-surface-50 px-4 py-2.5 text-sm text-navy-900 focus:border-navy-950 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {/* 5. Observações adicionais */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                  Descreva o que aconteceu (opcional)
                </label>
                <textarea
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: O carro parou de acelerar de repente e acendeu a luz da injeção."
                  className="w-full rounded-xl border border-line bg-surface-50 p-3 text-sm text-navy-900 focus:border-navy-950 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-go-orange text-sm font-bold text-navy-950 shadow-cta transition hover:-translate-y-0.5 hover:bg-go-orange-hover active:translate-y-0 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Registrando chamado emergencial...</span>
                ) : (
                  <>
                    <Truck className="h-4 w-4" />
                    <span>Confirmar e Acionar Socorro 24h</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
