'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ExternalLink,
  Search,
  X,
} from 'lucide-react'
import { PlanPricing, QuoteCalculationResult } from '@/lib/types'
import { brl, money } from '@/lib/site'
import {
  FloatingWhatsApp,
  SiteFooter,
  SiteHeader,
  TopBar,
} from '@/components/home/SiteChrome'
import {
  ComoFunciona,
  Coberturas,
  Comparativo,
  CtaFinal,
  Faq,
  PlanosPreview,
  SeguradoraDisseNao,
  Stats,
} from '@/components/home/HomeSections'
import { Economizometro } from '@/components/home/Economizometro'

const inputCls =
  'min-h-[48px] w-full rounded-lg border border-[#c9d1e6] bg-white px-3.5 text-base text-navy-800 placeholder:text-muted-2'
const labelCls = 'text-sm font-semibold'

export default function HomePage() {
  const router = useRouter()

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

  // Modal de Cadastro
  const [selectedPlan, setSelectedPlan] = useState<PlanPricing | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('Rio de Janeiro')
  const [veiculoTrabalho, setVeiculoTrabalho] = useState(false)
  const [isSubmittingLead, setIsSubmittingLead] = useState(false)
  const [submitSuccessData, setSubmitSuccessData] = useState<{
    vistoriaUrl: string
    pagamentoUrl?: string
    quotationCode?: string
    clientPhone?: string
    checkoutUrl?: string
  } | null>(null)

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

  // Formata CPF
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '')
    let formatted = raw
    if (raw.length > 3) formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`
    if (raw.length > 6) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
    if (raw.length > 9)
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`
    setCpf(formatted)
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

  // Envio de Cadastro Completo (Sem WhatsApp, direto pro CRM)
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
          cpf,
          whatsapp,
          email,
          cidade,
          veiculoTrabalho,
          placa: placa || quoteResult.vehicle.placa,
          planoEscolhidoId: selectedPlan.id,
          planoEscolhidoNome: selectedPlan.name,
          mensalidadeOriginal: selectedPlan.monthly,
          mensalidadeFinal,
          ativacao: selectedPlan.ativacao,
          comAdesivo,
          vehicle: quoteResult.vehicle,
          powercrmMeta: quoteResult.powercrmMeta,
          quoteToken: quoteResult.quoteToken,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSubmitSuccessData({
          vistoriaUrl: data.vistoriaUrl || '/vistoria',
          pagamentoUrl: data.pagamentoUrl,
          quotationCode: data.powerCrmQuotationCode,
          clientPhone: whatsapp,
          checkoutUrl: data.checkoutUrl,
        })
      } else {
        alert(data.error || 'Erro ao processar cadastro.')
      }
    } catch {
      alert('Erro de conexão ao enviar cadastro. Tente novamente.')
    } finally {
      setIsSubmittingLead(false)
    }
  }

  // Mensalidade exibida conforme os descontos marcados
  const priceFor = (plan: PlanPricing) => {
    if (comAdesivo && quoteResult?.regras.elegivelAdesivo) return plan.mensalidadeComAdesivo
    if (comPontualidade) return plan.mensalidadeComPontualidade
    return plan.monthly
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSubmitSuccessData(null)
  }

  // Fecha o modal com Esc
  useEffect(() => {
    if (!isModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isModalOpen])

  const busy = isSearchingPlate || isCalculating
  const spinner = (
    <span
      aria-label="Carregando"
      role="status"
      className="h-5 w-5 animate-spin rounded-full border-2 border-navy-950 border-t-transparent"
    />
  )
  const tabCls = (on: boolean) =>
    `min-h-[44px] rounded-lg text-[15px] transition ${
      on ? 'bg-white font-bold text-navy-800 shadow-[0_1px_3px_rgba(26,39,84,0.15)]' : 'font-semibold text-muted'
    }`
  const ctaCls =
    'flex min-h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-go-orange text-[17px] font-extrabold text-navy-950 transition hover:-translate-y-px hover:shadow-cta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none'

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 font-sans text-navy-800">
      <TopBar />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section
          id="topo"
          className="bg-navy-950 text-white [background-image:radial-gradient(ellipse_at_85%_0%,rgba(242,145,29,0.20),transparent_45%),radial-gradient(ellipse_at_0%_100%,rgba(199,211,1,0.10),transparent_45%),radial-gradient(circle_at_30%_20%,#22337a_0%,#111b45_50%,#0b1230_100%)]"
        >
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-8 px-6 pb-14 pt-10 sm:gap-14 sm:pb-24 sm:pt-20">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-go-lime/35 bg-go-lime/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#e6ee5c]">
                <Check aria-hidden className="h-4 w-4 text-go-lime" />
                Proteção veicular em todo o Brasil desde 2004
              </span>
              <h1 className="m-0 text-[40px] font-extrabold leading-[1.04] tracking-[-1.2px] sm:text-[64px] sm:tracking-[-2.4px]">
                Seu carro protegido pelo <span className="text-go-orange">preço oficial</span>, em 30 segundos.
              </h1>
              <p className="m-0 max-w-[560px] text-[19px] leading-relaxed text-muted-soft">
                Digite a placa e veja na hora os planos da 21Go para o seu veículo. 100% da Tabela FIPE, sem
                consulta ao SPC/Serasa e vistoria pelo celular — de qualquer estado.
              </p>
              <ul className="m-0 grid list-none gap-x-6 gap-y-3 p-0 text-base [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
                {[
                  'Indenização de 100% da FIPE',
                  'Sem análise de perfil',
                  'Aprovação em até 48h',
                  'Sem fidelidade nem multa',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Check aria-hidden className="h-5 w-5 shrink-0 text-go-orange" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Card de cotação */}
            <div
              id="cotacao"
              className="flex min-w-0 max-w-[460px] flex-[1_1_320px] scroll-mt-24 flex-col gap-5 rounded-3xl bg-white p-5 text-navy-800 shadow-[0_24px_64px_rgba(7,12,34,0.45)] sm:p-8"
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold tracking-[1.5px] text-muted">COTAÇÃO GRÁTIS</span>
                <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.6px]">Quanto custa proteger o seu?</h2>
              </div>

              <div
                role="tablist"
                aria-label="Forma de cotação"
                className="grid grid-cols-2 gap-1 rounded-[10px] bg-surface-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={searchMode === 'placa'}
                  onClick={() => setSearchMode('placa')}
                  className={tabCls(searchMode === 'placa')}
                >
                  Pela placa
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={searchMode === 'manual'}
                  onClick={() => setSearchMode('manual')}
                  className={tabCls(searchMode === 'manual')}
                >
                  Marca e modelo
                </button>
              </div>

              {searchMode === 'placa' ? (
                <form onSubmit={handleSearchPlate} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="placa-input" className="text-sm font-semibold">
                      Placa do veículo
                    </label>
                    <div className="overflow-hidden rounded-[10px] border-[3px] border-navy-800">
                      <div className="bg-navy-600 py-1 text-center text-[11px] font-bold tracking-[3px] text-white">
                        BRASIL
                      </div>
                      <input
                        id="placa-input"
                        type="text"
                        maxLength={7}
                        value={placa}
                        onChange={(e) => handlePlateChange(e.target.value)}
                        placeholder="ABC1D23"
                        autoComplete="off"
                        className="w-full border-0 bg-white p-3 text-center text-[32px] font-extrabold uppercase tracking-[6px] text-navy-950 placeholder:text-[#c9d1e6]"
                      />
                    </div>
                    <span className="text-[13px] text-muted">Padrão antigo ou Mercosul.</span>
                  </div>
                  <button type="submit" disabled={busy} className={ctaCls}>
                    {busy ? spinner : 'Ver meu preço agora'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleManualCalculate} className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label htmlFor="tipo" className={labelCls}>Tipo</label>
                      <select
                        id="tipo"
                        value={tipo}
                        onChange={(e) => {
                          setTipo(e.target.value as 'carro' | 'moto')
                          setSelectedBrand('')
                          setSelectedModel('')
                        }}
                        className={inputCls}
                      >
                        <option value="carro">Carro / Utilitário</option>
                        <option value="moto">Motocicleta</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="marca" className={labelCls}>Marca</label>
                      <select
                        id="marca"
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Selecione...</option>
                        {brands.map((b) => (
                          <option key={b.code} value={b.code}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="ano" className={labelCls}>Ano</label>
                      <select
                        id="ano"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Selecione...</option>
                        {years.map((y) => (
                          <option key={y.code} value={y.code}>{y.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label htmlFor="modelo" className={labelCls}>Modelo</label>
                      <select
                        id="modelo"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={!models.length}
                        className={`${inputCls} disabled:opacity-50`}
                      >
                        <option value="">
                          {models.length ? 'Selecione o modelo exato...' : 'Escolha a marca e o ano acima'}
                        </option>
                        {models.map((m) => (
                          <option key={m.code} value={m.code}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isCalculating || !selectedModel} className={ctaCls}>
                    {isCalculating ? spinner : (<><Search aria-hidden className="h-5 w-5" />Ver meu preço agora</>)}
                  </button>
                </form>
              )}

              {plateError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
                >
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  {plateError}
                </div>
              )}

              <p className="m-0 text-center text-[13px] leading-snug text-muted">
                Grátis e sem compromisso. Valores oficiais da 21Go, sem consulta ao SPC/Serasa.
              </p>
            </div>
          </div>
        </section>

        {/* Resultado da cotação */}
        {quoteResult && (
          <section id="planos-section" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-7 px-4 py-12 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
              <div className="flex min-w-0 flex-[1_1_380px] items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-surface-100">
                  <Car aria-hidden className="h-7 w-7 text-navy-600" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-bold tracking-[1.5px] text-go-lime-dark">VEÍCULO ENCONTRADO</span>
                  <h2 className="m-0 text-[28px] font-extrabold leading-tight tracking-[-0.8px] sm:text-[32px]">
                    {quoteResult.vehicle.marca} {quoteResult.vehicle.modelo}
                  </h2>
                  <p className="m-0 text-[15px] text-muted">
                    Ano {quoteResult.vehicle.ano}
                    {(placa || quoteResult.vehicle.placa) && ` · Placa ${placa || quoteResult.vehicle.placa}`} · FIPE{' '}
                    <strong className="text-navy-800">{brl(quoteResult.vehicle.fipeValue)}</strong>
                    {quoteResult.vehicle.fipeCode && ` · Cód. ${quoteResult.vehicle.fipeCode}`}
                    {' · '}
                    <a
                      href="#cotacao"
                      onClick={() => setQuoteResult(null)}
                      className="text-navy-600 underline"
                    >
                      Trocar veículo
                    </a>
                  </p>
                </div>
              </div>

              <fieldset className="m-0 flex flex-col gap-2.5 rounded-xl border border-line bg-surface-50 px-[18px] py-3.5">
                <legend className="px-1.5 text-xs font-bold tracking-[1.5px] text-muted">SEUS DESCONTOS</legend>
                {quoteResult.regras.elegivelAdesivo && (
                  <label className="flex min-h-[32px] cursor-pointer items-center gap-3 text-[15px] font-semibold">
                    <input
                      type="checkbox"
                      checked={comAdesivo}
                      onChange={(e) => setComAdesivo(e.target.checked)}
                      className="h-[22px] w-[22px] accent-navy-800"
                    />
                    <span>
                      Adesivo 21Go no vidro{' '}
                      <strong className="text-go-lime-dark">−{quoteResult.regras.percentualAdesivo}%</strong>
                    </span>
                  </label>
                )}
                <label className="flex min-h-[32px] cursor-pointer items-center gap-3 text-[15px] font-semibold">
                  <input
                    type="checkbox"
                    checked={comPontualidade}
                    onChange={(e) => setComPontualidade(e.target.checked)}
                    className="h-[22px] w-[22px] accent-navy-800"
                  />
                  <span>
                    Pagamento em dia <strong className="text-go-lime-dark">−{quoteResult.regras.percentualPontualidade || 5}%</strong>
                  </span>
                </label>
              </fieldset>
            </div>

            {quoteResult.regras.exigeVistoriaPresencial && (
              <div role="note" className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-amber-600" />
                <span>
                  <strong>Atenção:</strong> este modelo específico exige vistoria presencial na sede da 21Go após o envio inicial dos dados.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.6px]">Escolha o seu plano</h2>
              <p className="m-0 text-base text-muted">
                Valores oficiais da 21Go para este veículo. Sem fidelidade nem multa de cancelamento.
              </p>
            </div>

            <div className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]">
              {quoteResult.plans.map((plan) => {
                const price = priceFor(plan)
                const hasDiscount = price < plan.monthly
                const pop = !!plan.popular
                const muted = pop ? 'text-muted-soft' : 'text-muted'
                return (
                  <article
                    key={plan.id}
                    className={`flex flex-col gap-5 rounded-2xl p-6 ${
                      pop
                        ? 'border-2 border-go-orange bg-navy-950 text-white shadow-[0_16px_40px_rgba(11,18,48,0.25)]'
                        : 'border border-line bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex min-h-[26px] items-center justify-between gap-2">
                        <h3 className="m-0 text-[21px] font-extrabold">{plan.name}</h3>
                        {pop && (
                          <span className="rounded-full bg-go-orange px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-navy-950">
                            MAIS ESCOLHIDO
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold">R$</span>
                        <span className="text-[42px] font-extrabold leading-none tracking-[-1.5px]">{money(price)}</span>
                        <span className={`text-sm ${muted}`}>/mês</span>
                      </div>
                      {hasDiscount && (
                        <span className={`text-sm ${muted}`}>
                          Sem descontos: <s>R$ {money(plan.monthly)}</s>
                        </span>
                      )}
                      <span className={`text-sm ${muted}`}>
                        Ativação no Pix: <strong>{brl(plan.ativacao)}</strong>
                      </span>
                    </div>
                    <ul
                      className={`m-0 flex flex-1 list-none flex-col gap-2.5 border-t p-0 pt-4 text-[15px] leading-snug ${
                        pop ? 'border-navy-line' : 'border-line'
                      }`}
                    >
                      {plan.coberturas.map((cob, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-go-orange" />
                          <span>{cob}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan)
                        setIsModalOpen(true)
                      }}
                      className={`flex min-h-[50px] items-center justify-center rounded-lg text-base font-extrabold transition hover:-translate-y-px hover:shadow-cta ${
                        pop ? 'bg-go-orange text-navy-950' : 'border-2 border-navy-800 text-navy-800'
                      }`}
                    >
                      Quero este plano
                    </button>
                  </article>
                )
              })}
            </div>

            <Economizometro
              fipeValue={quoteResult.vehicle.fipeValue}
              mensalidade21Go={priceFor(quoteResult.plans.find((p) => p.popular) || quoteResult.plans[0])}
              ativacao21Go={quoteResult.plans[0]?.ativacao || 399.99}
              veiculoNome={`${quoteResult.vehicle.marca} ${quoteResult.vehicle.modelo}`}
            />

            <ul className="m-0 grid list-none gap-x-6 gap-y-3 rounded-2xl bg-surface-100 px-6 py-5 text-[15px] font-semibold [grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr))]">
              <li>100% da Tabela FIPE</li>
              <li>Sem consulta ao SPC/Serasa</li>
              <li>Vistoria online pelo celular</li>
              <li>Assistência 24h em todo o Brasil</li>
            </ul>
          </section>
        )}

        <Stats />
        <Coberturas />
        <PlanosPreview />
        <ComoFunciona />
        <Comparativo />
        <SeguradoraDisseNao />
        <Faq />
        <CtaFinal />
      </main>

      <SiteFooter />
      <FloatingWhatsApp />

      {/* Cadastro de adesão (direto para o CRM + vistoria) */}
      {isModalOpen && selectedPlan && quoteResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/70 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-6 text-navy-800 shadow-[0_24px_64px_rgba(7,12,34,0.45)] sm:p-8">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface-100"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>

            {submitSuccessData ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-go-lime">
                  <CheckCircle2 aria-hidden className="h-9 w-9 text-navy-950" />
                </span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold tracking-[1.5px] text-go-orange-dark">
                    PROPOSTA REGISTRADA OFICIALMENTE
                  </span>
                  <h3 id="modal-title" className="m-0 text-[26px] font-extrabold tracking-[-0.6px]">
                    Proposta enviada com sucesso!
                  </h3>
                  {submitSuccessData.quotationCode && (
                    <p className="m-0 mt-1 rounded-full border border-line bg-surface-100 px-3 py-1 font-mono text-xs text-muted">
                      Código CRM:{' '}
                      <strong className="text-navy-800">{submitSuccessData.quotationCode}</strong>
                    </p>
                  )}
                </div>

                <ol className="m-0 flex w-full list-none flex-col gap-3 rounded-xl bg-navy-950 p-4 text-left text-sm text-white">
                  {[
                    [
                      'Documentos',
                      `Envie CNH ou RG, documento do carro e comprovante de residência. O link também foi para o seu WhatsApp ${submitSuccessData.clientPhone || ''}.`,
                    ],
                    [
                      'Vistoria no App Visto',
                      'Enviamos no seu WhatsApp o link da vistoria oficial da 21Go, para as fotos do veículo.',
                    ],
                    [
                      'Adesão no Pix (último passo)',
                      'Com a vistoria aprovada, enviamos no WhatsApp o Pix da taxa de adesão. Pago, sua proteção é ativada.',
                    ],
                  ].map(([title, text], i) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-go-orange text-xs font-bold text-navy-950">
                        {i + 1}
                      </span>
                      <span>
                        <strong className="block">{title}</strong>
                        <span className="text-muted-soft">{text}</span>
                      </span>
                    </li>
                  ))}
                </ol>

                {submitSuccessData.pagamentoUrl ? (
                  <div className="flex w-full flex-col gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => router.push(submitSuccessData.pagamentoUrl!)}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-base font-extrabold text-white shadow-lg transition hover:bg-emerald-700 hover:shadow-xl"
                    >
                      <span>💳 Pagar adesão via Pix e ativar</span>
                    </button>
                    <p className="m-0 mt-1 text-xs text-muted">
                      Também enviamos o link de pagamento para o seu WhatsApp{' '}
                      <strong>{submitSuccessData.clientPhone}</strong>. Após o Pix, a vistoria é liberada automaticamente.
                    </p>
                  </div>
                ) : submitSuccessData.checkoutUrl ? (
                  <div className="flex w-full flex-col gap-2 mt-2">
                    <a
                      href={submitSuccessData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-base font-extrabold text-white no-underline shadow-lg transition hover:bg-emerald-700 hover:shadow-xl"
                    >
                      <span>✍️ Assinar Termo e Ativar Agora (Pix)</span>
                      <ExternalLink aria-hidden className="h-4 w-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => router.push(submitSuccessData.vistoriaUrl)}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-bold text-white transition hover:bg-navy-800"
                    >
                      <Camera aria-hidden className="h-4 w-4 text-go-lime" />
                      <span>📷 Fazer Auto-Vistoria no Celular</span>
                    </button>

                    <p className="m-0 mt-1 text-xs text-muted">
                      Também enviamos os links oficiais de assinatura e vistoria para o seu WhatsApp{' '}
                      <strong>{submitSuccessData.clientPhone}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => router.push(submitSuccessData.vistoriaUrl)}
                      className={`${ctaCls} mt-1`}
                    >
                      <Camera aria-hidden className="h-4 w-4" />
                      Enviar meus documentos
                    </button>
                    <p className="m-0 text-xs text-muted">
                      Enviamos a confirmação para o seu WhatsApp{' '}
                      <strong>{submitSuccessData.clientPhone}</strong>.
                    </p>
                  </>
                )}

                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-2 text-xs font-semibold text-muted hover:text-navy-800"
                >
                  Fechar janela
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1 pr-10">
                  <span className="text-xs font-bold tracking-[1.5px] text-go-orange-dark">CADASTRO DE ADESÃO</span>
                  <h3 id="modal-title" className="m-0 text-[26px] font-extrabold tracking-[-0.6px]">
                    Garantir plano {selectedPlan.name}
                  </h3>
                </div>

                <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-xl bg-navy-950 p-4 text-[15px] text-white">
                  <dt className="text-muted-soft">Veículo</dt>
                  <dd className="m-0 text-right">
                    {quoteResult.vehicle.marca} {quoteResult.vehicle.modelo} ({quoteResult.vehicle.ano})
                  </dd>
                  <dt className="text-muted-soft">Mensalidade</dt>
                  <dd className="m-0 text-right font-bold">R$ {money(priceFor(selectedPlan))}/mês</dd>
                  <dt className="text-muted-soft">Ativação (uma vez, no Pix)</dt>
                  <dd className="m-0 text-right">{brl(selectedPlan.ativacao)}</dd>
                </dl>

                <form onSubmit={handleSubmitLead} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="lead-nome" className={labelCls}>Nome completo do titular</label>
                    <input
                      id="lead-nome"
                      type="text"
                      required
                      autoComplete="name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex.: Carlos Silva"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lead-cpf" className={labelCls}>CPF do titular</label>
                      <input
                        id="lead-cpf"
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={14}
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        placeholder="000.000.000-00"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lead-whatsapp" className={labelCls}>WhatsApp com DDD</label>
                      <input
                        id="lead-whatsapp"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={whatsapp}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lead-email" className={labelCls}>E-mail</label>
                      <input
                        id="lead-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lead-cidade" className={labelCls}>Cidade</label>
                      <input
                        id="lead-cidade"
                        type="text"
                        required
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Ex.: Rio de Janeiro"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-50 px-4 py-2 text-[15px] font-semibold">
                    <input
                      type="checkbox"
                      checked={veiculoTrabalho}
                      onChange={(e) => setVeiculoTrabalho(e.target.checked)}
                      className="h-[22px] w-[22px] shrink-0 accent-navy-800"
                    />
                    <span>Veículo usado para trabalho (Uber, 99, táxi ou entrega)</span>
                  </label>

                  <button type="submit" disabled={isSubmittingLead} className={`${ctaCls} mt-1`}>
                    {isSubmittingLead ? (
                      spinner
                    ) : (
                      <>
                        Avançar para a vistoria digital
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="m-0 text-center text-[13px] leading-relaxed text-muted">
                    Seus dados são cadastrados de forma segura no Power CRM e você recebe as orientações de ativação.
                    Você não paga nada agora.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
