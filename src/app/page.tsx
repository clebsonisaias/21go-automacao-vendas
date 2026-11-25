'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Car,
  Check,
  CheckCircle2,
  BadgePercent,
  ExternalLink,
  Info,
  Search,
  X,
} from 'lucide-react'
import { PlanPricing, QuoteCalculationResult } from '@/lib/types'
import { brl, money } from '@/lib/site'
import { UFS, estadoPelaPosicao } from '@/lib/tabela-nordeste'
import { CONTORNOS } from '@/lib/contornos-tabela'
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
  const [comAdesivo, setComAdesivo] = useState(false)
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
  // Cupom de desconto na adesão (opcional): conferido no servidor sobre a cotação assinada.
  const [cupomCodigo, setCupomCodigo] = useState('')
  const [cupomInfo, setCupomInfo] = useState<{ codigo: string; ativacaoOriginal: number; ativacaoFinal: number } | null>(null)
  const [cupomErro, setCupomErro] = useState('')
  const [cupomConferindo, setCupomConferindo] = useState(false)
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

  // Estado onde o cliente mora: no RN, na PB e no CE a mensalidade sai pela tabela regional.
  // Lembrado no aparelho; sem ele, pede a localização ao abrir e preenche só se a pessoa estiver
  // num desses três estados (a conta é feita aqui no aparelho: a localização não sai dele).
  const [uf, setUf] = useState('')
  const [ufErro, setUfErro] = useState('')
  const [ufPelaLocalizacao, setUfPelaLocalizacao] = useState(false)
  const ufAtual = useRef('')
  useEffect(() => {
    ufAtual.current = uf
  }, [uf])
  useEffect(() => {
    try {
      const salvo = localStorage.getItem('21go-uf')
      if (salvo && salvo in UFS) {
        setUf(salvo)
        return
      }
    } catch {}
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const achado = estadoPelaPosicao(pos.coords.latitude, pos.coords.longitude, CONTORNOS)
        // Quem já escolheu o estado enquanto a localização chegava não é atropelado.
        if (!achado || ufAtual.current) return
        setUf(achado)
        setUfPelaLocalizacao(true)
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    )
  }, [])
  const escolherUf = (v: string) => {
    setUf(v)
    setUfPelaLocalizacao(false)
    if (v) setUfErro('')
    try {
      localStorage.setItem('21go-uf', v)
    } catch {}
  }
  const faltaUf = () => {
    if (uf) return false
    setUfErro('Escolha o estado onde você mora para ver o preço.')
    document.getElementById('uf-select')?.focus()
    return true
  }

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
    if (faltaUf()) return

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
          uf,
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
    if (faltaUf()) return

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
          uf,
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

  // O desconto do cupom é sobre a adesão do plano escolhido: trocou de plano, confere de novo.
  useEffect(() => {
    setCupomInfo(null)
    setCupomErro('')
  }, [selectedPlan?.id])

  /** Confere o cupom digitado; devolve se ele vale (o desconto aparece no resumo). */
  const conferirCupom = async (): Promise<boolean> => {
    const codigo = cupomCodigo.trim()
    if (!codigo || !selectedPlan || !quoteResult) {
      setCupomErro('Digite o código do cupom.')
      return false
    }
    setCupomConferindo(true)
    setCupomErro('')
    try {
      const res = await fetch('/api/cupom/conferir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, quoteToken: quoteResult.quoteToken, planoId: selectedPlan.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.ok) {
        setCupomInfo({ codigo: d.codigo, ativacaoOriginal: d.ativacaoOriginal, ativacaoFinal: d.ativacaoFinal })
        return true
      }
      setCupomInfo(null)
      setCupomErro(d?.erro || 'Não foi possível conferir o cupom agora. Tente de novo.')
      return false
    } catch {
      setCupomErro('Sem conexão com o servidor. Tente de novo.')
      return false
    } finally {
      setCupomConferindo(false)
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

    // Cupom digitado e ainda não conferido: confere antes, para um código errado não
    // gastar tentativa de cadastro nem enviar o cadastro sem o desconto que o cliente espera.
    if (cupomCodigo.trim() && !cupomInfo) {
      const vale = await conferirCupom()
      if (!vale) {
        document.getElementById('lead-cupom')?.focus()
        return
      }
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
          whatsapp,
          email,
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
          ...(cupomCodigo.trim() ? { cupomCodigo: cupomCodigo.trim() } : {}),
        }),
      })

      const data = await res.json()
      if (!data.success && data.campo === 'cupom') {
        // Cupom recusado: o cadastro não foi feito; mostra no campo do cupom.
        setCupomInfo(null)
        setCupomErro(data.error || 'Cupom não aceito.')
        return
      }
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

  // Plano em promoção pela tabela regional (RN, PB, CE): vem primeiro e em destaque.
  const planoPromocao = quoteResult?.plans.find((p) => p.regional)

  // Mensalidade exibida conforme os descontos marcados
  const priceFor = (plan: PlanPricing) => {
    if (comAdesivo && quoteResult?.regras.elegivelAdesivo) return plan.mensalidadeComAdesivo
    if (comPontualidade) return plan.mensalidadeComPontualidade
    return plan.monthly
  }

  // Preço nacional com os mesmos descontos marcados, para o "de/por" do VIP regional ser justo.
  const nacionalFor = (plan: PlanPricing): number | undefined => {
    const nac = plan.regional?.nacional
    if (!nac) return plan.precoNacional
    if (comAdesivo && quoteResult?.regras.elegivelAdesivo) return nac.adesivo
    if (comPontualidade) return nac.pontualidade
    return nac.monthly
  }

  // O desconto de pagamento em dia só vale até o vencimento (o do adesivo já inclui ele).
  const notaEmDia = (plan: PlanPricing): string | null => {
    const price = priceFor(plan)
    if (price >= plan.monthly) return null
    if (comAdesivo && quoteResult?.regras.elegivelAdesivo && plan.mensalidadeComAdesivo < plan.mensalidadeComPontualidade) {
      return 'Pagando em dia. Com atraso, sai o desconto de 5%.'
    }
    return `Pagando em dia. Com atraso: R$\u00a0${money(plan.monthly)}.`
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
  const ufField = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="uf-select" className={labelCls}>
        Estado onde você mora
      </label>
      <select
        id="uf-select"
        value={uf}
        onChange={(e) => escolherUf(e.target.value)}
        aria-required="true"
        aria-invalid={ufErro ? true : undefined}
        aria-describedby={ufErro ? 'uf-erro uf-ajuda' : 'uf-ajuda'}
        className={`${inputCls} aria-[invalid=true]:border-red-700`}
      >
        <option value="">Selecione...</option>
        {Object.entries(UFS)
          .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
          .map(([sigla, nomeUf]) => (
            <option key={sigla} value={sigla}>
              {nomeUf}
            </option>
          ))}
      </select>
      {ufErro && (
        <span id="uf-erro" className="flex items-start gap-1.5 text-sm font-semibold text-red-700">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {ufErro}
        </span>
      )}
      <span id="uf-ajuda" className="text-[13px] text-muted">
        {ufPelaLocalizacao ? 'Preenchido pela sua localização: troque se você mora em outro estado. ' : ''}
        No Rio Grande do Norte, na Paraíba e no Ceará, a mensalidade sai pela tabela regional. O comprovante de residência
        confirma o estado.
      </span>
    </div>
  )

  const ctaCls =
    'flex min-h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-go-orange text-[17px] font-extrabold text-navy-950 transition hover:-translate-y-px hover:shadow-cta active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none'

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
          {/* Celular: título → cartão da cotação → resto. Computador: texto à esquerda, cartão à direita. */}
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_460px] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-6 lg:pb-24 lg:pt-20">
            <div className="flex min-w-0 flex-col gap-3 sm:gap-5 lg:col-start-1 lg:row-start-1 lg:self-end">
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#e6ee5c]">
                <Check aria-hidden className="h-4 w-4 text-go-lime" />
                Proteção veicular em todo o Brasil desde 2004
              </span>
              <h1 className="m-0 text-[32px] font-extrabold leading-[1.06] tracking-[-1px] sm:text-[48px] sm:tracking-[-1.6px] lg:text-[64px] lg:tracking-[-2.4px]">
                Seu carro protegido pelo <span className="text-go-orange">preço oficial</span>, em 30 segundos.
              </h1>
            </div>
            {/* Card de cotação */}
            <div
              id="cotacao"
              className="flex w-full min-w-0 max-w-[460px] scroll-mt-24 flex-col gap-5 justify-self-center rounded-3xl bg-white p-5 text-navy-800 shadow-[0_24px_64px_rgba(7,12,34,0.45)] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center lg:justify-self-end"
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
                  {ufField}
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
                  {ufField}
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

            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2 lg:self-start">
              <p className="m-0 max-w-[560px] text-[17px] leading-relaxed text-muted-soft sm:text-[19px]">
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
                    aria-describedby="ajuda-pontualidade"
                    className="h-[22px] w-[22px] accent-navy-800"
                  />
                  <span>
                    Pagamento em dia <strong className="text-go-lime-dark">−{quoteResult.regras.percentualPontualidade || 5}%</strong>
                  </span>
                </label>
                <p id="ajuda-pontualidade" className="m-0 pl-[34px] text-sm text-muted">
                  Só para a mensalidade paga até o vencimento. Com atraso, vale o valor normal.
                </p>
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

            {quoteResult.regiao?.regional && !quoteResult.regiao.tabela && (
              <div role="note" className="flex items-center gap-3 rounded-2xl border border-line bg-surface-50 p-4 text-sm">
                <Info aria-hidden className="h-5 w-5 shrink-0 text-navy-600" />
                <span>A FIPE deste veículo passa da tabela regional, então vale o preço nacional da 21Go.</span>
              </div>
            )}

            {quoteResult.regiao?.tabela && planoPromocao && (
              <div role="note" className="flex items-start gap-3 rounded-2xl border-2 border-go-orange bg-white p-4 text-[15px] shadow-card">
                <BadgePercent aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
                <span>
                  <strong>Promoção para quem mora em {UFS[quoteResult.regiao.uf] ?? quoteResult.regiao.uf}:</strong> o plano{' '}
                  {planoPromocao.name} sai pela tabela regional. Os descontos de pagamento em dia e do adesivo valem como nos
                  outros planos, que seguem o preço nacional.
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
              {quoteResult.plans.map((plan, i) => {
                const price = priceFor(plan)
                const nacional = nacionalFor(plan)
                const nota = notaEmDia(plan)
                const pop = !!plan.popular
                const muted = pop ? 'text-muted-soft' : 'text-muted'
                return (
                  <article
                    key={plan.id}
                    style={{ animationDelay: `${Math.min(i, 3) * 60}ms` }}
                    className={`entrar-plano relative flex flex-col gap-5 rounded-2xl p-6 ${
                      pop
                        ? 'border-2 border-go-orange bg-navy-950 text-white shadow-[0_16px_40px_rgba(11,18,48,0.25)]'
                        : 'border border-line bg-white'
                    }`}
                  >
                    {/* Promoção da tabela regional: anel laranja pulsando algumas vezes ao aparecer a cotação. */}
                    {plan.regional && nacional && nacional > price && (
                      <span
                        key={quoteResult.quoteToken || 'promo'}
                        aria-hidden
                        className="promo-anel pointer-events-none absolute -inset-[6px] rounded-[22px] border-[3px] border-go-orange"
                      />
                    )}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex min-h-[26px] items-center justify-between gap-2">
                        <h3 className="m-0 text-[21px] font-extrabold">{plan.name}</h3>
                        {pop && (
                          <span className="rounded-full bg-go-orange px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-navy-950">
                            {plan.regional ? (nacional && nacional > price ? 'PROMOÇÃO' : 'PREÇO REGIONAL') : 'MAIS ESCOLHIDO'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold">R$</span>
                        <span key={price} className="trocar-valor text-[42px] font-extrabold leading-none tracking-[-1.5px]">{money(price)}</span>
                        <span className={`text-sm ${muted}`}>/mês</span>
                      </div>
                      {nota && <span className={`text-sm ${muted}`}>{nota}</span>}
                      {plan.regional && nacional && nacional > price && (
                        <>
                          <span className={`text-sm ${muted}`}>
                            Preço nacional: <s>R$ {money(nacional)}</s>
                          </span>
                          <span className={`text-sm font-bold ${pop ? 'text-go-orange' : 'text-go-orange-dark'}`}>
                            Economia de R$ {money(nacional - price)} por mês
                          </span>
                        </>
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
                      className={`flex min-h-[50px] items-center justify-center rounded-lg text-base font-extrabold transition hover:-translate-y-px hover:shadow-cta active:scale-[0.98] ${
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
              ativacao21Go={(quoteResult.plans.find((p) => p.popular) || quoteResult.plans[0])?.ativacao || 399.99}
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
                  <dd className="m-0 text-right font-bold">
                    {selectedPlan.regional && (nacionalFor(selectedPlan) ?? 0) > priceFor(selectedPlan) && (
                      <s className="block font-normal text-muted-soft">R$ {money(nacionalFor(selectedPlan) ?? 0)}</s>
                    )}
                    <span className="whitespace-nowrap">R$ {money(priceFor(selectedPlan))}/mês</span>
                    {notaEmDia(selectedPlan) && (
                      <span className="block text-sm font-normal text-muted-soft">{notaEmDia(selectedPlan)}</span>
                    )}
                  </dd>
                  <dt className="text-muted-soft">Ativação (uma vez, no Pix)</dt>
                  <dd className="m-0 text-right">
                    {cupomInfo ? (
                      <>
                        <s className="mr-2 text-muted-soft">{brl(cupomInfo.ativacaoOriginal)}</s>
                        <strong>{cupomInfo.ativacaoFinal <= 0 ? 'Grátis' : brl(cupomInfo.ativacaoFinal)}</strong>
                      </>
                    ) : (
                      brl(selectedPlan.ativacao)
                    )}
                  </dd>
                </dl>

                <form onSubmit={handleSubmitLead} className="flex flex-col gap-4">
                  <p className="m-0 text-sm text-muted">
                    Só precisamos do seu contato. Nome, CPF e endereço saem dos documentos que você envia no próximo passo.
                    Você vai receber as mensagens deste cadastro no WhatsApp da CITmax.
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="lead-cupom" className={labelCls}>
                      Tem cupom de desconto na adesão? (opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="lead-cupom"
                        autoComplete="off"
                        autoCapitalize="characters"
                        value={cupomCodigo}
                        onChange={(e) => {
                          setCupomCodigo(e.target.value.toUpperCase())
                          setCupomInfo(null)
                          setCupomErro('')
                        }}
                        onKeyDown={(e) => {
                          // Enter no cupom confere o cupom em vez de enviar o cadastro.
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            conferirCupom()
                          }
                        }}
                        aria-invalid={Boolean(cupomErro)}
                        aria-describedby={cupomErro ? 'lead-cupom-erro' : cupomInfo ? 'lead-cupom-ok' : undefined}
                        placeholder="Código do cupom"
                        className={`${inputCls} uppercase aria-[invalid=true]:border-red-700`}
                      />
                      <button
                        type="button"
                        onClick={conferirCupom}
                        disabled={cupomConferindo}
                        className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg border border-navy-800 px-4 text-sm font-bold text-navy-800 transition hover:bg-surface-100 disabled:cursor-wait disabled:opacity-60"
                      >
                        {cupomConferindo ? 'Conferindo…' : 'Aplicar'}
                      </button>
                    </div>
                    {cupomInfo && (
                      <p id="lead-cupom-ok" role="status" className="m-0 text-sm font-semibold text-emerald-700">
                        Cupom {cupomInfo.codigo} aplicado:{' '}
                        {cupomInfo.ativacaoFinal <= 0
                          ? 'adesão grátis.'
                          : `adesão de ${brl(cupomInfo.ativacaoOriginal)} por ${brl(cupomInfo.ativacaoFinal)}.`}
                      </p>
                    )}
                    {cupomErro && (
                      <p id="lead-cupom-erro" role="alert" className="m-0 text-sm font-semibold text-red-700">
                        {cupomErro}
                      </p>
                    )}
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
