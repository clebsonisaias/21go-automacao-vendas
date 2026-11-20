'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, MessageCircle, Search } from 'lucide-react'
import { PlanPricing, QuoteCalculationResult } from '@/lib/types'
import { monthlyWithDiscounts } from '@/lib/format'
import { Plate, Logo } from './Plate'
import { Plans } from './Plans'
import { LeadDialog } from './LeadDialog'
import { Coverage, Faq, Footer, HowItWorks } from './Sections'
import { WhatsAppFloat } from './WhatsAppFloat'

type Option = { code: string; name: string }
type ModelOption = Option & { codFipe: string }

function Spinner() {
  return (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  )
}

export function HomeClient({ whatsapp }: { whatsapp: string }) {
  const wa = `https://wa.me/${whatsapp}`
  const waCotacao = `${wa}?text=${encodeURIComponent('Olá, gostaria de fazer uma cotação da 21Go')}`

  // Busca
  const [placa, setPlaca] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchMode, setSearchMode] = useState<'placa' | 'manual'>('placa')

  // Busca manual
  const [tipo, setTipo] = useState<'carro' | 'moto'>('carro')
  const [brands, setBrands] = useState<Option[]>([])
  const [years, setYears] = useState<Option[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  // Resultado
  const [quoteResult, setQuoteResult] = useState<QuoteCalculationResult | null>(null)
  const [searchedPlate, setSearchedPlate] = useState('')
  const [comAdesivo, setComAdesivo] = useState(true)
  const [comPontualidade, setComPontualidade] = useState(true)

  // Contratação
  const [selectedPlan, setSelectedPlan] = useState<PlanPricing | null>(null)

  const plansHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (searchMode !== 'manual') return
    fetch(`/api/vehicle/brands?tipo=${tipo}`)
      .then((res) => res.json())
      .then((data) => setBrands(data.data || []))
      .catch(() => {})
    fetch('/api/vehicle/years')
      .then((res) => res.json())
      .then((data) => setYears(data.data || []))
      .catch(() => {})
  }, [searchMode, tipo])

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

  // Ao chegar o resultado, leva a pessoa até os planos
  useEffect(() => {
    if (!quoteResult) return
    const el = plansHeadingRef.current
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el?.focus({ preventScroll: true })
  }, [quoteResult])

  const handlePlateChange = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (raw.length <= 7) {
      setPlaca(raw)
      setSearchError('')
    }
  }

  const calculate = async (body: Record<string, unknown>, fallbackError: string) => {
    const calcRes = await fetch('/api/quote/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const calcData = await calcRes.json()
    if (calcData.success) {
      setQuoteResult(calcData)
    } else {
      setSearchError(calcData.error || fallbackError)
    }
  }

  const handleSearchPlate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (placa.length < 7) {
      setSearchError('Digite os 7 caracteres da placa.')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setQuoteResult(null)

    try {
      const res = await fetch(`/api/vehicle/plate?plate=${placa}`)
      const data = await res.json()

      if (!res.ok || data.status === 'notfound') {
        setSearchError('Não encontramos essa placa. Confira os caracteres ou busque pela marca e pelo modelo.')
        return
      }

      setSearchedPlate(placa)
      await calculate(
        {
          tipo: data.tipo || 'carro',
          brandId: data.brandId,
          brandText: data.brandText,
          modelId: data.modelId,
          modelText: data.modelText,
          year: data.year,
          codFipe: data.codFipe,
        },
        'Não foi possível calcular a cotação deste modelo. Chame um consultor no WhatsApp.'
      )
    } catch {
      setSearchError('Não conseguimos consultar agora. Tente de novo em instantes.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleManualCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    const brandObj = brands.find((b) => b.code === selectedBrand)
    const modelObj = models.find((m) => m.code === selectedModel)
    if (!selectedBrand || !selectedYear || !modelObj) {
      setSearchError('Escolha a marca, o ano e o modelo.')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setQuoteResult(null)
    setSearchedPlate('')

    try {
      await calculate(
        {
          tipo,
          brandId: selectedBrand,
          brandText: brandObj?.name || '',
          modelId: selectedModel,
          modelText: modelObj.name,
          year: selectedYear,
          codFipe: modelObj.codFipe,
        },
        'Não foi possível calcular a cotação deste modelo. Chame um consultor no WhatsApp.'
      )
    } catch {
      setSearchError('Não conseguimos calcular agora. Tente de novo em instantes.')
    } finally {
      setIsSearching(false)
    }
  }

  const switchMode = (mode: 'placa' | 'manual') => {
    setSearchMode(mode)
    setSearchError('')
  }

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ir para o conteúdo
      </a>

      {/* Topo + hero */}
      <div className="bg-cone">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <a href="#cotacao" aria-label="21Go Proteção veicular, início">
            <Logo />
          </a>
          <nav aria-label="Principal" className="hidden items-center gap-7 text-[0.95rem] font-semibold lg:flex">
            <a href="#como-funciona" className="underline-offset-4 hover:underline">Como funciona</a>
            <a href="#coberturas" className="underline-offset-4 hover:underline">Coberturas</a>
            <a href="#duvidas" className="underline-offset-4 hover:underline">Dúvidas</a>
          </nav>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="btn shrink-0 whitespace-nowrap !px-4 !py-2.5 !text-lg bg-tinta text-white hover:bg-azul-dark"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span className="sm:hidden">WhatsApp</span>
            <span className="hidden sm:inline">Falar no WhatsApp</span>
          </a>
        </header>

        <section
          id="cotacao"
          className="mx-auto grid max-w-6xl gap-x-14 gap-y-8 px-5 pb-16 pt-6 lg:grid-cols-[1fr_32rem] lg:grid-rows-[auto_auto] lg:pb-24 lg:pt-14"
        >
          <h1 className="font-display text-[clamp(2.9rem,7.4vw,5.6rem)] font-extrabold leading-[0.92] tracking-tight order-1 lg:order-none lg:col-start-1 lg:row-start-1 lg:self-end">
            Digite a placa e veja quanto custa proteger seu veículo
          </h1>

          <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2 lg:-mt-2">
            <p className="max-w-[34rem] text-lg leading-relaxed sm:text-xl">
              Os valores são os oficiais da 21Go, calculados na hora pela tabela FIPE. Sem consulta ao SPC/Serasa.
            </p>
            <ul className="mt-7 space-y-2.5 text-base font-semibold sm:text-lg">
              {[
                'Indenização de 100% da tabela FIPE',
                'Vistoria feita pelo celular, sem fila',
                'Socorro 24 horas em todo o Brasil',
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 bg-tinta" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-2 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            {searchMode === 'placa' ? (
              <form onSubmit={handleSearchPlate} noValidate>
                <label htmlFor="placa-input" className="mb-3 block text-lg font-bold">
                  Placa do veículo
                </label>
                <Plate className="placa-entrada">
                  <input
                    id="placa-input"
                    className="placa-input"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={7}
                    value={placa}
                    onChange={(e) => handlePlateChange(e.target.value)}
                    placeholder="ABC1D23"
                    aria-describedby="placa-ajuda"
                  />
                </Plate>
                <p id="placa-ajuda" className="mt-3 text-sm font-medium">
                  Funciona com placa antiga e Mercosul.
                </p>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="btn mt-5 w-full bg-tinta text-white hover:bg-azul-dark"
                >
                  {isSearching ? (
                    <>
                      <Spinner /> Buscando planos
                    </>
                  ) : (
                    'Ver planos e preços'
                  )}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleManualCalculate}
                className="rounded-lg border-[3px] border-tinta bg-white p-5 shadow-[6px_6px_0_#0E1A3B] sm:p-6"
              >
                <h2 className="font-display text-2xl font-bold">Buscar por marca e modelo</h2>

                <fieldset className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  <legend className="sr-only">Tipo de veículo</legend>
                  {(
                    [
                      ['carro', 'Carro ou utilitário'],
                      ['moto', 'Moto'],
                    ] as const
                  ).map(([v, label]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 font-semibold">
                      <input
                        type="radio"
                        name="tipo"
                        checked={tipo === v}
                        onChange={() => {
                          setTipo(v)
                          setSelectedBrand('')
                          setSelectedModel('')
                        }}
                        className="h-5 w-5 accent-azul"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="marca" className="mb-1.5 block text-sm font-semibold">Marca</label>
                    <select
                      id="marca"
                      className="campo"
                      value={selectedBrand}
                      onChange={(e) => {
                        setSelectedBrand(e.target.value)
                        setSelectedModel('')
                      }}
                    >
                      <option value="">Escolha a marca</option>
                      {brands.map((b) => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ano" className="mb-1.5 block text-sm font-semibold">Ano</label>
                    <select
                      id="ano"
                      className="campo"
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value)
                        setSelectedModel('')
                      }}
                    >
                      <option value="">Escolha o ano</option>
                      {years.map((y) => (
                        <option key={y.code} value={y.code}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="modelo" className="mb-1.5 block text-sm font-semibold">Modelo</label>
                  <select
                    id="modelo"
                    className="campo"
                    value={selectedModel}
                    disabled={!models.length}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="">
                      {models.length ? 'Escolha o modelo exato' : 'Escolha antes a marca e o ano'}
                    </option>
                    {models.map((m) => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !selectedModel}
                  className="btn mt-5 w-full bg-tinta text-white hover:bg-azul-dark"
                >
                  {isSearching ? (
                    <>
                      <Spinner /> Buscando planos
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" aria-hidden="true" />
                      Ver planos e preços
                    </>
                  )}
                </button>
              </form>
            )}

            {searchError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-3 rounded-md border-l-4 border-erro bg-white px-4 py-3 text-[0.95rem] font-medium"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-erro" aria-hidden="true" />
                <span>
                  {searchError}{' '}
                  {searchMode === 'placa' && placa.length === 7 && (
                    <button
                      type="button"
                      onClick={() => switchMode('manual')}
                      className="font-bold underline underline-offset-2"
                    >
                      Buscar por marca e modelo
                    </button>
                  )}
                </span>
              </div>
            )}

            <p className="mt-5 text-base">
              {searchMode === 'placa' ? (
                <>
                  Não sabe a placa?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('manual')}
                    className="font-bold underline underline-offset-4"
                  >
                    Buscar por marca e modelo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode('placa')}
                  className="font-bold underline underline-offset-4"
                >
                  Voltar para a busca por placa
                </button>
              )}
            </p>
          </div>
        </section>
        <div className="faixa" aria-hidden="true" />
      </div>

      <main id="conteudo">
        {quoteResult && (
          <Plans
            quote={quoteResult}
            plate={searchedPlate}
            comAdesivo={comAdesivo}
            comPontualidade={comPontualidade}
            onAdesivo={setComAdesivo}
            onPontualidade={setComPontualidade}
            onChoose={setSelectedPlan}
            headingRef={plansHeadingRef}
          />
        )}
        <HowItWorks />
        <Coverage />
        <Faq whatsappUrl={waCotacao} />
      </main>

      <Footer />
      <WhatsAppFloat href={waCotacao} />

      {selectedPlan && quoteResult && (
        <LeadDialog
          plan={selectedPlan}
          quote={quoteResult}
          plate={searchedPlate}
          price={monthlyWithDiscounts(selectedPlan, quoteResult.regras, {
            adesivo: comAdesivo,
            pontualidade: comPontualidade,
          })}
          comAdesivo={comAdesivo && quoteResult.regras.elegivelAdesivo}
          whatsappUrl={waCotacao}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </>
  )
}
