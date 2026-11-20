'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Car,
  Check,
  Phone,
  ArrowRight,
  X,
  AlertTriangle,
  Sparkles,
  Clock,
  CheckCircle2,
  Lock,
  Search,
  ChevronRight,
  MessageCircle,
} from 'lucide-react'
import { VehicleInfo, PlanPricing, QuoteCalculationResult } from '@/lib/types'

export default function HomePage() {
  // Estados de busca
  const [placa, setPlaca] = useState('')
  const [isSearchingPlate, setIsSearchingPlate] = useState(false)
  const [plateError, setPlateError] = useState('')
  const [searchMode, setSearchMode] = useState<'placa' | 'manual'>('placa')

  // Busca manual
  const [tipo, setTipo] = useState<'carro' | 'moto'>('carro')
  const [brands, setBrands] = useState<Array<{ code: string; name: string }>>([])
  const [years, setYears] = useState<Array<{ code: string; name: string }>>([])
  const [models, setModels] = useState<Array<{ code: string; name: string; codFipe: string }>>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  // Resultado da Cotação
  const [quoteResult, setQuoteResult] = useState<QuoteCalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Opções de Desconto
  const [comAdesivo, setComAdesivo] = useState(true)
  const [comPontualidade, setComPontualidade] = useState(true)

  // Modal de Contratação
  const [selectedPlan, setSelectedPlan] = useState<PlanPricing | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmittingLead, setIsSubmittingLead] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Carrega marcas e anos quando troca para manual
  useEffect(() => {
    if (searchMode === 'manual') {
      fetch(`/api/vehicle/brands?tipo=${tipo}`)
        .then((res) => res.json())
        .then((data) => setBrands(data.data || []))
        .catch(() => {})

      fetch(`/api/vehicle/years`)
        .then((res) => res.json())
        .then((data) => setYears(data.data || []))
        .catch(() => {})
    }
  }, [searchMode, tipo])

  // Carrega modelos quando marca e ano são selecionados
  useEffect(() => {
    if (selectedBrand && selectedYear) {
      fetch(`/api/vehicle/models?brandId=${selectedBrand}&year=${selectedYear}`)
        .then((res) => res.json())
        .then((data) => setModels(data.data || []))
        .catch(() => {})
    } else {
      setModels([])
    }
  }, [selectedBrand, selectedYear])

  // Formata Placa
  const handlePlateChange = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (raw.length <= 7) {
      setPlaca(raw)
      setPlateError('')
    }
  }

  // Busca por Placa
  const handleSearchPlate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = placa.replace(/[^A-Z0-9]/g, '')
    if (clean.length < 7) {
      setPlateError('Digite a placa completa (7 caracteres).')
      return
    }

    setIsSearchingPlate(true)
    setPlateError('')
    setQuoteResult(null)

    try {
      const res = await fetch(`/api/vehicle/plate?plate=${clean}`)
      const data = await res.json()

      if (!res.ok || data.status === 'notfound') {
        setPlateError('Placa não encontrada. Você pode preencher manualmente abaixo.')
        setIsSearchingPlate(false)
        return
      }

      // Se encontrou, calcula o preço direto
      setIsCalculating(true)
      const calcRes = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: data.tipo || 'carro',
          brandId: data.brandId,
          brandText: data.brandText,
          modelId: data.modelId,
          modelText: data.modelText,
          year: data.year,
          codFipe: data.codFipe,
        }),
      })

      const calcData = await calcRes.json()
      if (calcData.success) {
        setQuoteResult(calcData)
      } else {
        setPlateError(calcData.error || 'Não foi possível calcular a cotação deste modelo.')
      }
    } catch {
      setPlateError('Falha ao conectar com o serviço de cotação.')
    } finally {
      setIsSearchingPlate(false)
      setIsCalculating(false)
    }
  }

  // Busca Manual
  const handleManualCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrand || !selectedYear || !selectedModel) {
      setPlateError('Selecione a marca, o ano e o modelo.')
      return
    }

    const brandObj = brands.find((b) => b.code === selectedBrand)
    const modelObj = models.find((m) => m.code === selectedModel)

    if (!modelObj) return

    setIsCalculating(true)
    setPlateError('')
    setQuoteResult(null)

    try {
      const calcRes = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          brandId: selectedBrand,
          brandText: brandObj?.name || '',
          modelId: selectedModel,
          modelText: modelObj.name,
          year: selectedYear,
          codFipe: modelObj.codFipe,
        }),
      })

      const calcData = await calcRes.json()
      if (calcData.success) {
        setQuoteResult(calcData)
      } else {
        setPlateError(calcData.error || 'Não foi possível calcular a cotação deste modelo.')
      }
    } catch {
      setPlateError('Falha ao calcular cotação.')
    } finally {
      setIsCalculating(false)
    }
  }

  // Formata telefone
  const handlePhoneChange = (val: string) => {
    const numbers = val.replace(/\D/g, '')
    let formatted = numbers
    if (numbers.length > 2) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    }
    if (numbers.length > 7) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
    setWhatsapp(formatted)
  }

  // Envio de Lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan || !quoteResult) return

    const cleanPhone = whatsapp.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      alert('Digite um número de WhatsApp válido com DDD.')
      return
    }

    setIsSubmittingLead(true)

    // Calcula valor final do plano conforme os toggles
    let mensalidadeFinal = selectedPlan.monthly
    if (comAdesivo && quoteResult.regras.elegivelAdesivo) {
      mensalidadeFinal = selectedPlan.mensalidadeComAdesivo
    } else if (comPontualidade) {
      mensalidadeFinal = selectedPlan.mensalidadeComPontualidade
    }

    try {
      const res = await fetch('/api/quote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          whatsapp,
          email,
          placa: placa || quoteResult.vehicle.placa,
          planoEscolhidoId: selectedPlan.id,
          planoEscolhidoNome: selectedPlan.name,
          mensalidadeOriginal: selectedPlan.monthly,
          mensalidadeFinal,
          ativacao: selectedPlan.ativacao,
          comAdesivo,
          vehicle: quoteResult.vehicle,
          powercrmMeta: quoteResult.powercrmMeta,
        }),
      })

      const data = await res.json()
      if (data.success && data.whatsappUrl) {
        setSubmitSuccess(true)
        setTimeout(() => {
          window.location.href = data.whatsappUrl
        }, 1200)
      }
    } catch {
      alert('Erro ao enviar dados. Tente novamente ou nos chame diretamente no WhatsApp.')
    } finally {
      setIsSubmittingLead(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Bar / Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-black text-xl tracking-tighter text-white shadow-lg shadow-brand-500/20">
              21
            </div>
            <div>
              <div className="font-extrabold text-lg leading-tight tracking-tight flex items-center gap-1.5">
                21Go Proteção
                <span className="text-xs bg-brand-500/20 text-brand-400 font-semibold px-2 py-0.5 rounded-full border border-brand-500/30">
                  Franquia Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400">Atendimento e Cotação Instantânea</p>
            </div>
          </div>

          <a
            href="https://wa.me/5521999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Consultor
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pt-10 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-brand-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Cotação com Preço Oficial 21Go em Tempo Real
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Proteja seu veículo pelo <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-brand-400 via-amber-300 to-brand-500 bg-clip-text text-transparent">
                menor valor oficial do Rio
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Simule grátis sem precisar deixar dados pessoais. Preço transparente, 100% tabela FIPE
              e assistência 24h completa.
            </p>

            {/* Box de Cotação */}
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-5 sm:p-7 max-w-2xl mx-auto text-left border border-slate-100">
              {/* Switch de Modo */}
              <div className="flex border-b border-slate-100 mb-5 pb-3 gap-4 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setSearchMode('placa')}
                  className={`pb-2 border-b-2 transition ${
                    searchMode === 'placa'
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Consultar por Placa (Instantâneo)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('manual')}
                  className={`pb-2 border-b-2 transition ${
                    searchMode === 'manual'
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Buscar por Marca e Modelo
                </button>
              </div>

              {searchMode === 'placa' ? (
                <form onSubmit={handleSearchPlate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="placa-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2"
                    >
                      Digite a Placa do Veículo
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          id="placa-input"
                          type="text"
                          maxLength={7}
                          value={placa}
                          onChange={(e) => handlePlateChange(e.target.value)}
                          placeholder="Ex: ABC1234 ou ABC1D23"
                          className="w-full uppercase font-mono font-bold text-xl px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-slate-400"
                        />
                        <span className="absolute right-3.5 top-3.5 text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">
                          BRASIL
                        </span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSearchingPlate || isCalculating}
                        className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 text-white font-bold px-6 py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
                      >
                        {isSearchingPlate || isCalculating ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            Ver Cotação
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleManualCalculate} className="space-y-3.5">
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={tipo === 'carro'}
                        onChange={() => setTipo('carro')}
                        name="tipo"
                        className="accent-brand-600"
                      />
                      Carro / Utilitário
                    </label>
                    <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={tipo === 'moto'}
                        onChange={() => setTipo('moto')}
                        name="tipo"
                        className="accent-brand-600"
                      />
                      Motocicleta
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Marca</label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">Selecione a marca...</option>
                        {brands.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Ano</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">Selecione o ano...</option>
                        {years.map((y) => (
                          <option key={y.code} value={y.code}>
                            {y.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Modelo</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={!models.length}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="">
                        {models.length ? 'Selecione o modelo...' : 'Escolha marca e ano primeiro'}
                      </option>
                      {models.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isCalculating || !selectedModel}
                    className="w-full mt-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {isCalculating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Calcular Cotação
                      </>
                    )}
                  </button>
                </form>
              )}

              {plateError && (
                <div className="mt-3.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {plateError}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Resultados da Cotação */}
        {quoteResult && (
          <section className="max-w-6xl mx-auto px-4 py-12">
            {/* Box de Confirmação do Veículo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Car className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                    Veículo Identificado
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {quoteResult.vehicle.marca} {quoteResult.vehicle.modelo}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ano: {quoteResult.vehicle.ano} • FIPE:{' '}
                    <span className="font-semibold text-slate-700">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(quoteResult.vehicle.fipeValue)}
                    </span>{' '}
                    • Código FIPE: {quoteResult.vehicle.fipeCode}
                  </p>
                </div>
              </div>

              {/* Toggles de Descontos */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-4 text-xs">
                {quoteResult.regras.elegivelAdesivo && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={comAdesivo}
                      onChange={(e) => setComAdesivo(e.target.checked)}
                      className="w-4 h-4 accent-brand-600 rounded"
                    />
                    Adesivo 21Go (-{quoteResult.regras.percentualAdesivo}%)
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={comPontualidade}
                    onChange={(e) => setComPontualidade(e.target.checked)}
                    className="w-4 h-4 accent-brand-600 rounded"
                  />
                  Pontualidade (-5%)
                </label>
              </div>
            </div>

            {quoteResult.regras.exigeVistoriaPresencial && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Atenção:</strong> Este modelo específico requer vistoria presencial na
                  sede da 21Go após a aprovação do cadastro.
                </span>
              </div>
            )}

            {/* Grid de Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quoteResult.plans.map((plan) => {
                let valorExibido = plan.monthly
                if (comAdesivo && quoteResult.regras.elegivelAdesivo) {
                  valorExibido = plan.mensalidadeComAdesivo
                } else if (comPontualidade) {
                  valorExibido = plan.mensalidadeComPontualidade
                }

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl bg-white border p-6 flex flex-col transition-all hover:shadow-xl ${
                      plan.popular
                        ? 'border-brand-500 shadow-md ring-2 ring-brand-500/20'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                        Mais Escolhido
                      </span>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-slate-500">R$</span>
                        <span className="text-3xl font-black text-slate-900">
                          {valorExibido.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-slate-400">/mês</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Taxa de ativação:{' '}
                        <strong className="text-slate-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(plan.ativacao)}
                        </strong>{' '}
                        no Pix
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        O que inclui:
                      </div>
                      <ul className="space-y-2 text-xs text-slate-600">
                        {plan.coberturas.map((cob, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{cob}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan)
                        setIsModalOpen(true)
                      }}
                      className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      Quero Este Plano
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Seção de Vantagens e Confiança */}
        <section className="bg-slate-50 border-t border-slate-200 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Por que escolher nossa Franquia 21Go?
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                Mais agilidade no atendimento e a segurança da maior proteção veicular do estado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-brand-600 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">100% Tabela FIPE</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sem pegadinhas ou depreciação injusta. Indenização integral garantida em caso de
                  roubo, furto ou perda total.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">Assistência 24h Completa</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Guincho em todo o território nacional, socorro mecânico, elétrico, chaveiro e
                  troca de pneus a qualquer hora.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">Sem Análise de Perfil</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Não consultamos SPC/Serasa, não exigimos CEP de pernoite e aceitamos motoristas de
                  aplicativo e carros de trabalho.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal de Fechamento / Cadastro do Lead */}
      {isModalOpen && selectedPlan && quoteResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {submitSuccess ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Cotação Enviada com Sucesso!</h3>
                <p className="text-xs text-slate-500">
                  Redirecionando você para o WhatsApp do nosso consultor...
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                    Finalizar Cotação
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    Garantir Plano {selectedPlan.name}
                  </h3>
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                    <p>
                      <strong>Veículo:</strong> {quoteResult.vehicle.marca}{' '}
                      {quoteResult.vehicle.modelo} ({quoteResult.vehicle.ano})
                    </p>
                    <p>
                      <strong>Mensalidade:</strong> R${' '}
                      {(comAdesivo && quoteResult.regras.elegivelAdesivo
                        ? selectedPlan.mensalidadeComAdesivo
                        : selectedPlan.mensalidadeComPontualidade
                      )
                        .toFixed(2)
                        .replace('.', ',')}
                      /mês
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitLead} className="space-y-4">
                  <div>
                    <label
                      htmlFor="lead-nome"
                      className="block text-xs font-bold text-slate-700 uppercase mb-1"
                    >
                      Seu Nome Completo *
                    </label>
                    <input
                      id="lead-nome"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lead-whatsapp"
                      className="block text-xs font-bold text-slate-700 uppercase mb-1"
                    >
                      WhatsApp com DDD *
                    </label>
                    <input
                      id="lead-whatsapp"
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(21) 99999-9999"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lead-email"
                      className="block text-xs font-bold text-slate-700 uppercase mb-1"
                    >
                      E-mail (Opcional)
                    </label>
                    <input
                      id="lead-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joao@exemplo.com"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmittingLead ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        Garantir Cotação no WhatsApp
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center">
                    Seus dados são 100% protegidos e tratados exclusivamente pela nossa franquia
                    autorizada.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 21Go Franquia Autorizada — Todos os direitos reservados.</p>
          <p className="text-slate-500">
            Valores oficiais sincronizados em tempo real com o motor de cotação 21Go.
          </p>
        </div>
      </footer>
    </div>
  )
}
