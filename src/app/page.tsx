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
  MessageCircle,
  Wrench,
  Key,
  HelpCircle,
  ChevronDown,
  FileCheck,
  Zap,
  Users,
  Award,
  ThumbsUp,
  CreditCard,
  MapPin,
  ExternalLink,
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

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
        setPlateError('Placa não encontrada na base nacional. Você pode buscar por marca e modelo abaixo.')
        setIsSearchingPlate(false)
        return
      }

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
        // Rola suavemente até os planos
        setTimeout(() => {
          document.getElementById('planos-section')?.scrollIntoView({ behavior: 'smooth' })
        }, 150)
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
        setTimeout(() => {
          document.getElementById('planos-section')?.scrollIntoView({ behavior: 'smooth' })
        }, 150)
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

  const faqs = [
    {
      q: 'Precisa de análise de perfil ou consulta ao SPC/Serasa?',
      a: 'Não! Na 21Go não fazemos consulta de crédito nem restrição por idade, estado civil, CEP de residência ou se você trabalha com aplicativo (Uber, 99). A proteção é para o veículo.',
    },
    {
      q: 'Quanto tempo leva para meu veículo ficar protegido?',
      a: 'Após a aprovação da vistoria (feita 100% online por fotos no celular) e a confirmação da taxa de ativação, a proteção entra em vigor no mesmo dia!',
    },
    {
      q: 'O que é o desconto do adesivo 21Go?',
      a: 'Se você optar por colocar o adesivo discreto da 21Go no vidro traseiro do seu veículo, você ganha até 15% de desconto vitalício em todas as suas mensalidades.',
    },
    {
      q: 'Como funciona a assistência 24h e o guincho?',
      a: 'Você conta com uma central 0800 disponível 24 horas por dia, 7 dias por semana em todo o Brasil. Cobre reboque/guincho, socorro mecânico, socorro elétrico, troca de pneus, chaveiro e hospedagem emergencial.',
    },
    {
      q: 'Como é feito o pagamento das mensalidades?',
      a: 'As mensalidades são pagas mensalmente via boleto bancário ou Pix, com desconto de 5% por pontualidade pagando até o dia de vencimento escolhido (dia 10 ou 20).',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-900 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Header Fixo */}
      <header className="bg-slate-950/80 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-400 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-brand-500/25">
              21
            </div>
            <div>
              <div className="font-black text-lg leading-tight tracking-tight flex items-center gap-2 text-white">
                21Go Proteção
                <span className="hidden sm:inline-flex text-[10px] bg-brand-500/15 text-brand-400 font-bold px-2 py-0.5 rounded-full border border-brand-500/30 uppercase">
                  Franquia Autorizada
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Atendimento Exclusivo e Direto</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#cotacao" className="hover:text-brand-400 transition">Cotação Online</a>
            <a href="#beneficios" className="hover:text-brand-400 transition">Benefícios</a>
            <a href="#como-funciona" className="hover:text-brand-400 transition">Como Funciona</a>
            <a href="#duvidas" className="hover:text-brand-400 transition">Dúvidas Frequentes</a>
          </nav>

          <a
            href="https://wa.me/5521999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp do Consultor</span>
            <span className="sm:hidden">Consultor</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section id="cotacao" className="relative pt-12 pb-20 px-4 overflow-hidden">
          {/* Efeitos de Fundo */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 right-10 w-[400px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-brand-400 mb-6 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Preços Oficiais em Tempo Real • Sem Fidelidade Abusiva
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-5 leading-[1.15]">
              Proteja seu veículo pelo{' '}
              <span className="bg-gradient-to-r from-brand-400 via-amber-300 to-brand-500 bg-clip-text text-transparent">
                preço oficial do Rio
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Consulte grátis em <strong>30 segundos</strong> digitando a placa. Sem pegadinhas, 100% tabela FIPE e cobertura completa para roubo, furto, colisão e guincho 24h.
            </p>

            {/* Box Principal de Cotação */}
            <div className="bg-slate-950/90 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-2xl mx-auto text-left backdrop-blur-xl relative">
              <div className="flex border-b border-slate-800 mb-6 pb-3 gap-6 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setSearchMode('placa')}
                  className={`pb-2 border-b-2 transition flex items-center gap-2 ${
                    searchMode === 'placa'
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Consultar por Placa (Instantâneo)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('manual')}
                  className={`pb-2 border-b-2 transition flex items-center gap-2 ${
                    searchMode === 'manual'
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  Marca e Modelo
                </button>
              </div>

              {searchMode === 'placa' ? (
                <form onSubmit={handleSearchPlate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="placa-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2"
                    >
                      Placa do Veículo (Padrão Antigo ou Mercosul)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <input
                          id="placa-input"
                          type="text"
                          maxLength={7}
                          value={placa}
                          onChange={(e) => handlePlateChange(e.target.value)}
                          placeholder="Ex: ABC1D23"
                          className="w-full uppercase font-mono font-black text-2xl px-4 py-3.5 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:border-brand-500 focus:outline-none transition tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-slate-500 text-white"
                        />
                        <span className="absolute right-3.5 top-3.5 text-[10px] font-black bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-md">
                          BRASIL
                        </span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSearchingPlate || isCalculating}
                        className="bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 text-base"
                      >
                        {isSearchingPlate || isCalculating ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Ver Preço Oficial</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleManualCalculate} className="space-y-4">
                  <div className="flex gap-6 mb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={tipo === 'carro'}
                        onChange={() => setTipo('carro')}
                        name="tipo"
                        className="accent-brand-500"
                      />
                      Carro / Utilitário
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={tipo === 'moto'}
                        onChange={() => setTipo('moto')}
                        name="tipo"
                        className="accent-brand-500"
                      />
                      Motocicleta
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Marca</label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white"
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Ano</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white"
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={!models.length}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:border-brand-500 focus:outline-none disabled:opacity-40 text-white"
                    >
                      <option value="">
                        {models.length ? 'Selecione o modelo exato...' : 'Escolha a marca e o ano acima'}
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
                    className="w-full mt-2 bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                  >
                    {isCalculating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Calcular Cotação Oficial
                      </>
                    )}
                  </button>
                </form>
              )}

              {plateError && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {plateError}
                </div>
              )}
            </div>

            {/* Badges de Confiança */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 max-w-3xl mx-auto text-left">
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">100% Tabela FIPE</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Sem SPC/Serasa</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                <Zap className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Vistoria Online</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Socorro 24 Horas</span>
              </div>
            </div>
          </div>
        </section>

        {/* Resultados da Cotação (Se preenchido) */}
        {quoteResult && (
          <section id="planos-section" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-20">
            {/* Box do Veículo */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                  <Car className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Veículo Identificado com Sucesso
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                    {quoteResult.vehicle.marca} {quoteResult.vehicle.modelo}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Ano: <strong className="text-slate-200">{quoteResult.vehicle.ano}</strong> •
                    FIPE Oficial:{' '}
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(quoteResult.vehicle.fipeValue)}
                    </span>{' '}
                    • Código: {quoteResult.vehicle.fipeCode}
                  </p>
                </div>
              </div>

              {/* Toggles de Descontos */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-5 text-xs">
                {quoteResult.regras.elegivelAdesivo && (
                  <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={comAdesivo}
                      onChange={(e) => setComAdesivo(e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded"
                    />
                    <span>
                      Adesivo 21Go{' '}
                      <span className="text-emerald-400 font-bold">
                        (-{quoteResult.regras.percentualAdesivo}%)
                      </span>
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={comPontualidade}
                    onChange={(e) => setComPontualidade(e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded"
                  />
                  <span>
                    Pontualidade <span className="text-emerald-400 font-bold">(-5%)</span>
                  </span>
                </label>
              </div>
            </div>

            {quoteResult.regras.exigeVistoriaPresencial && (
              <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Atenção:</strong> Este modelo específico exige vistoria presencial na sede da 21Go após o envio inicial dos dados.
                </span>
              </div>
            )}

            {/* Grid dos 4 Planos Oficiais */}
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
                    className={`relative rounded-3xl bg-slate-950 border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                      plan.popular
                        ? 'border-brand-500 shadow-2xl shadow-brand-500/20 ring-1 ring-brand-500'
                        : 'border-slate-800 shadow-lg'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                        Mais Escolhido
                      </span>
                    )}

                    <div className="mb-5">
                      <h3 className="text-xl font-black text-white">{plan.name}</h3>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-400">R$</span>
                        <span className="text-4xl font-black text-white tracking-tight">
                          {valorExibido.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-slate-400">/mês</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <span>Taxa de ativação no Pix:</span>
                        <strong className="text-slate-200">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(plan.ativacao)}
                        </strong>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-4 flex-1">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                        Coberturas Inclusas:
                      </div>
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        {plan.coberturas.map((cob, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">{cob}</span>
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
                      className={`mt-6 w-full py-3.5 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 active:scale-95 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white shadow-lg shadow-brand-500/25'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <span>Quero Este Plano</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Como Funciona o Processo */}
        <section id="como-funciona" className="py-20 px-4 bg-slate-950/60 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Simplicidade e Agilidade
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
                Como funciona a adesão?
              </h2>
              <p className="text-slate-400 text-sm mt-3">
                Esqueça filas e papeladas. Seu carro protegido em apenas 4 passos descomplicados:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
                <span className="text-4xl font-black text-brand-500/30">01</span>
                <h3 className="font-bold text-base text-white mt-2 mb-1">Cote pela Placa</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite sua placa e veja instantaneamente os valores e planos disponíveis sem burocracia.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
                <span className="text-4xl font-black text-brand-500/30">02</span>
                <h3 className="font-bold text-base text-white mt-2 mb-1">Escolha seu Plano</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Selecione o plano ideal para suas necessidades e aproveite os descontos de adesivo e pontualidade.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
                <span className="text-4xl font-black text-brand-500/30">03</span>
                <h3 className="font-bold text-base text-white mt-2 mb-1">Vistoria 100% Online</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tire as fotos do seu veículo pelo celular sem sair de casa, sem filas e com aprovação rápida.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
                <span className="text-4xl font-black text-brand-500/30">04</span>
                <h3 className="font-bold text-base text-white mt-2 mb-1">Veículo Protegido</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Após a aprovação, seu veículo já está coberto com assistência 24h em todo o Brasil.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios / Coberturas Detalhadas */}
        <section id="beneficios" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Tudo o Que Você Precisa
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
                Proteção completa sem pegadinhas
              </h2>
              <p className="text-slate-400 text-sm mt-3">
                Conheça os pilares que fazem da 21Go a proteção veicular preferida dos motoristas do Rio de Janeiro:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-7 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-5">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">Roubo, Furto e Colisão</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Indenização integral de 100% da Tabela FIPE em casos de roubo, furto, colisão e perda total. Sem burocracia desnecessária.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-7 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
                  <Wrench className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">Assistência 24 Horas</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Guincho em todo o território nacional, socorro mecânico e elétrico, recarga de bateria, chaveiro e troca de pneus a qualquer hora.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-7 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">Danos Materiais a Terceiros</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cobertura para prejuízos causados a veículos de terceiros de até R$ 100.000,00, trazendo tranquilidade total no trânsito.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-7 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">Carro Reserva</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Opções de carro reserva de 7 a 15 dias para você não ficar a pé enquanto seu veículo é reparado em oficinas credenciadas.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-7 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">Fenômenos da Natureza</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Proteção completa contra enchentes, alagamentos, queda de árvores e chuva de granizo, cada vez mais comuns nas cidades.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-7 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">Sem Análise de Perfil</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Qualquer pessoa habilitada pode dirigir o veículo sem afetar a indenização. Aceitamos motoristas de app e carros de trabalho.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Perguntas Frequentes */}
        <section id="duvidas" className="py-20 px-4 bg-slate-950/60 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Tire Suas Dúvidas
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
                Perguntas Frequentes
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-5 text-left font-bold text-sm sm:text-base text-white flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        openFaq === idx ? 'rotate-180 text-brand-400' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5521999999999?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20uma%20cota%C3%A7%C3%A3o%20da%2021Go"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com consultor no WhatsApp"
        className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-400 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold px-0 group-hover:px-2">
          Falar no WhatsApp
        </span>
      </a>

      {/* Modal de Fechamento / Cadastro do Lead */}
      {isModalOpen && selectedPlan && quoteResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {submitSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white">Cotação Concluída!</h3>
                <p className="text-xs text-slate-300 max-w-xs mx-auto">
                  Redirecionando você para o WhatsApp do nosso consultor com a proposta pronta...
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                    Quase Pronto
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    Garantir Plano {selectedPlan.name}
                  </h3>
                  <div className="mt-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1.5">
                    <p>
                      <strong>Veículo:</strong> {quoteResult.vehicle.marca}{' '}
                      {quoteResult.vehicle.modelo} ({quoteResult.vehicle.ano})
                    </p>
                    <p>
                      <strong>Mensalidade:</strong>{' '}
                      <span className="text-emerald-400 font-bold">
                        R${' '}
                        {(comAdesivo && quoteResult.regras.elegivelAdesivo
                          ? selectedPlan.mensalidadeComAdesivo
                          : selectedPlan.mensalidadeComPontualidade
                        )
                          .toFixed(2)
                          .replace('.', ',')}
                        /mês
                      </span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitLead} className="space-y-4">
                  <div>
                    <label
                      htmlFor="lead-nome"
                      className="block text-xs font-bold text-slate-300 uppercase mb-1.5"
                    >
                      Seu Nome Completo *
                    </label>
                    <input
                      id="lead-nome"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lead-whatsapp"
                      className="block text-xs font-bold text-slate-300 uppercase mb-1.5"
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
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lead-email"
                      className="block text-xs font-bold text-slate-300 uppercase mb-1.5"
                    >
                      E-mail (Opcional)
                    </label>
                    <input
                      id="lead-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="carlos@exemplo.com"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white placeholder:text-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-95 text-base mt-2"
                  >
                    {isSubmittingLead ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        Garantir Minha Proteção no WhatsApp
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Ao continuar, seu orçamento será registrado no nosso sistema e um consultor exclusivo dará atendimento imediato via WhatsApp.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Completo */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white font-black flex items-center justify-center text-sm">
              21
            </div>
            <div>
              <p className="font-bold text-white">21Go Proteção Veicular — Franquia Autorizada</p>
              <p className="text-[11px] text-slate-500">Atendimento e Cotação Online para o Estado do Rio de Janeiro</p>
            </div>
          </div>

          <p className="text-slate-500 text-center md:text-right text-[11px] max-w-md">
            As cotações apresentadas refletem os valores oficiais sincronizados com o motor PowerCRM. Proteção patrimonial veicular operada em regime associativo conforme o artigo 5º da CF/88.
          </p>
        </div>
      </footer>
    </div>
  )
}
