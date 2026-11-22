'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'

// Aba "Cupons" do /admin (padrão Lista): cupons de desconto na taxa de adesão.
// A regra de verdade fica no servidor (src/lib/cupons.ts); aqui só se cria, edita, liga e exclui.

interface Cupom {
  id: string
  codigo: string
  descricao?: string
  tipo: 'valor' | 'percentual'
  desconto: number
  inicio?: string
  fim?: string
  maxUsos: number | null
  usos: number
  ativo: boolean
  criadoEm: string
}

type Vale = 'uma' | 'periodo'

interface Formulario {
  id?: string
  codigo: string
  descricao: string
  tipo: 'valor' | 'percentual'
  desconto: string
  vale: Vale
  inicio: string
  fim: string
  maxUsos: string
  ativo: boolean
}

type Campo = 'codigo' | 'desconto' | 'fim'

const VAZIO: Formulario = {
  codigo: '',
  descricao: '',
  tipo: 'percentual',
  desconto: '',
  vale: 'uma',
  inicio: '',
  fim: '',
  maxUsos: '',
  ativo: true,
}

const POR_PAGINA = 20
const CODIGO = /^[A-Z0-9][A-Z0-9-]{1,28}[A-Z0-9]$/

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted'
const campo =
  'min-h-[44px] w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 aria-[invalid=true]:border-red-700'
const rotulo = 'text-sm font-semibold text-navy-800'
const primario =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800'
const paginaBtn =
  'inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-line px-3 font-semibold text-navy-800 hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const dataBr = (d?: string) => (d ? d.split('-').reverse().join('/') : '')
const hojeBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function desconto(c: Cupom) {
  if (c.tipo === 'percentual') return c.desconto >= 100 ? 'Adesão grátis (100%)' : `${c.desconto}%`
  return brl(c.desconto)
}

function regra(c: Cupom) {
  const partes: string[] = []
  if (c.maxUsos === 1) partes.push('Vale uma vez só')
  else if (c.maxUsos) partes.push(`Até ${c.maxUsos} usos`)
  else partes.push('Sem limite de usos')
  if (c.inicio || c.fim) {
    partes.push(
      c.inicio && c.fim
        ? `de ${dataBr(c.inicio)} a ${dataBr(c.fim)}`
        : c.inicio
          ? `a partir de ${dataBr(c.inicio)}`
          : `até ${dataBr(c.fim)}`
    )
  }
  return partes.join(' · ')
}

/** Se o cupom vale hoje, pela mesma regra do servidor; senão, o motivo curto. */
function situacao(c: Cupom): { valendo: boolean; texto: string } {
  const hoje = hojeBrasilia()
  if (!c.ativo) return { valendo: false, texto: 'Desligado' }
  if (c.inicio && hoje < c.inicio) return { valendo: false, texto: `Começa em ${dataBr(c.inicio)}` }
  if (c.fim && hoje > c.fim) return { valendo: false, texto: 'Venceu' }
  if (c.maxUsos && c.usos >= c.maxUsos) return { valendo: false, texto: c.maxUsos === 1 ? 'Já foi usado' : 'Esgotado' }
  return { valendo: true, texto: 'Valendo' }
}

function paraFormulario(c: Cupom): Formulario {
  return {
    id: c.id,
    codigo: c.codigo,
    descricao: c.descricao || '',
    tipo: c.tipo,
    desconto: String(c.desconto).replace('.', ','),
    vale: c.maxUsos === 1 ? 'uma' : 'periodo',
    inicio: c.inicio || '',
    fim: c.fim || '',
    maxUsos: c.maxUsos && c.maxUsos !== 1 ? String(c.maxUsos) : '',
    ativo: c.ativo,
  }
}

/** Erro de um campo, com o que fazer. Vazio quando está certo. */
function erroDoCampo(f: Formulario, k: Campo): string {
  if (k === 'codigo') {
    if (!f.codigo.trim()) return 'Digite o código do cupom.'
    if (!CODIGO.test(f.codigo.trim())) return 'Use de 3 a 30 letras, números ou hífen, sem espaço. Ex.: AMIGO21.'
    return ''
  }
  if (k === 'desconto') {
    const n = Number(f.desconto.replace(',', '.'))
    if (!f.desconto.trim() || !Number.isFinite(n) || n <= 0) return 'Digite um desconto maior que zero.'
    if (f.tipo === 'percentual' && n > 100) return 'A porcentagem vai até 100 (adesão grátis).'
    return ''
  }
  if (f.vale === 'periodo' && f.inicio && f.fim && f.fim < f.inicio) return 'A data final precisa ser igual ou depois do início.'
  return ''
}

export function CuponsPanel() {
  const [cupons, setCupons] = useState<Cupom[] | null>(null)
  const [pixLigado, setPixLigado] = useState(true)
  const [erroCarga, setErroCarga] = useState('')
  const [form, setForm] = useState<Formulario | null>(null)
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const [erroForm, setErroForm] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ocupado, setOcupado] = useState('')
  const [excluindo, setExcluindo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)

  const buscaRef = useRef<HTMLInputElement>(null)
  const tituloFormRef = useRef<HTMLHeadingElement>(null)
  const gatilhoRef = useRef<HTMLElement | null>(null)

  const load = useCallback(async () => {
    setErroCarga('')
    try {
      const res = await fetch('/api/admin/cupons', { cache: 'no-store' })
      const d = await res.json()
      if (d.success) {
        setCupons(d.cupons)
        setPixLigado(Boolean(d.pixLigado))
      } else setErroCarga('Não foi possível carregar os cupons.')
    } catch {
      setErroCarga('Sem conexão com o servidor.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // "/" leva à busca, como na aba Cadastros.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))) return
      e.preventDefault()
      buscaRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Abriu o formulário: o foco vai para o título dele (no celular ele fica no alto da página).
  const formAberto = form ? form.id || 'novo' : ''
  useEffect(() => {
    if (formAberto) tituloFormRef.current?.focus()
  }, [formAberto])

  function abrir(f: Formulario, gatilho: HTMLElement) {
    gatilhoRef.current = gatilho
    setForm(f)
    setErros({})
    setErroForm('')
    setMensagem('')
  }

  function fechar() {
    setForm(null)
    setErros({})
    setErroForm('')
    // Volta o foco para quem abriu; se ele sumiu (botão do cabeçalho some com o formulário aberto), vai para a busca.
    const g = gatilhoRef.current
    requestAnimationFrame(() => (g && g.isConnected ? g : buscaRef.current)?.focus())
  }

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f))
    if (erroForm) setErroForm('')
    if (k === 'codigo' || k === 'desconto' || k === 'fim') setErros((e) => ({ ...e, [k]: '' }))
    if (k === 'tipo') setErros((e) => ({ ...e, desconto: '' }))
    if (k === 'inicio' || k === 'vale') setErros((e) => ({ ...e, fim: '' }))
  }

  const conferir = (k: Campo) => {
    if (form) setErros((e) => ({ ...e, [k]: erroDoCampo(form, k) }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const novos: Partial<Record<Campo, string>> = {
      codigo: erroDoCampo(form, 'codigo'),
      desconto: erroDoCampo(form, 'desconto'),
      fim: erroDoCampo(form, 'fim'),
    }
    setErros(novos)
    const primeiro = (['codigo', 'desconto', 'fim'] as Campo[]).find((k) => novos[k])
    if (primeiro) {
      document.getElementById(`cupom-${primeiro}`)?.focus()
      return
    }
    setSalvando(true)
    setErroForm('')
    const corpo = {
      codigo: form.codigo.trim(),
      descricao: form.descricao,
      tipo: form.tipo,
      desconto: Number(String(form.desconto).replace(',', '.')),
      inicio: form.vale === 'periodo' ? form.inicio : '',
      fim: form.vale === 'periodo' ? form.fim : '',
      maxUsos: form.vale === 'uma' ? 1 : form.maxUsos === '' ? null : Number(form.maxUsos),
      ativo: form.ativo,
    }
    try {
      const res = await fetch(form.id ? `/api/admin/cupons/${form.id}` : '/api/admin/cupons', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setCupons(d.cupons)
        const codigo = corpo.codigo.toUpperCase()
        const editando = Boolean(form.id)
        fechar()
        setMensagem(editando ? `Cupom ${codigo} salvo.` : `Cupom ${codigo} criado.`)
        if (!editando) {
          setBusca('')
          setPagina(1)
        }
      } else setErroForm(d.error || 'Não foi possível salvar. Confira os campos e tente de novo.')
    } catch {
      setErroForm('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function ligar(c: Cupom) {
    setOcupado(c.id)
    setMensagem('')
    try {
      const res = await fetch(`/api/admin/cupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !c.ativo }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setCupons(d.cupons)
        setMensagem(`Cupom ${c.codigo} ${c.ativo ? 'desligado' : 'ligado'}.`)
      } else setMensagem(d.error || 'Não foi possível mudar o cupom. Tente de novo.')
    } catch {
      setMensagem('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setOcupado('')
    }
  }

  async function excluir(c: Cupom) {
    setOcupado(c.id)
    setMensagem('')
    try {
      const res = await fetch(`/api/admin/cupons/${c.id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setCupons(d.cupons)
        setMensagem(`Cupom ${c.codigo} excluído.`)
        buscaRef.current?.focus()
      } else setMensagem(d.error || 'Não foi possível excluir o cupom. Tente de novo.')
    } catch {
      setMensagem('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setOcupado('')
      setExcluindo('')
    }
  }

  // Ordem padrão: os mais novos primeiro. A busca olha o código e a descrição.
  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim())
    return [...(cupons || [])]
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0))
      .filter((c) => !termo || semAcento(`${c.codigo} ${c.descricao || ''}`).includes(termo))
  }, [cupons, busca])
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const deIndice = (paginaAtual - 1) * POR_PAGINA
  const visiveis = filtrados.slice(deIndice, deIndice + POR_PAGINA)

  if (erroCarga) {
    return (
      <div role="alert" className="rounded-xl border border-line bg-white p-6 text-sm text-navy-900">
        {erroCarga}{' '}
        <button type="button" onClick={load} className="font-semibold text-navy-600 underline-offset-2 hover:underline">
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!cupons) {
    return (
      <div className="rounded-xl border border-line bg-white p-6" aria-busy="true">
        <div className="h-4 w-48 animate-pulse rounded bg-surface-100" />
        <div className="mt-4 h-40 w-full animate-pulse rounded bg-surface-100" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy-900">Cupons</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            Desconto na taxa de adesão. O cliente digita o cupom no cadastro, na página dos documentos ou no chat.
          </p>
        </div>
        {!form && (
          <button type="button" onClick={(e) => abrir({ ...VAZIO }, e.currentTarget)} className={primario}>
            <Plus aria-hidden className="h-4 w-4" />
            Criar cupom
          </button>
        )}
      </div>

      {!pixLigado && (
        <p role="note" className="m-0 rounded-xl border border-line bg-white p-4 text-sm text-navy-900">
          O Pix do site está desligado: o cupom só vale no Pix da adesão do site, não no checkout do PowerCRM.
        </p>
      )}

      {form && (
        <form onSubmit={salvar} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
          <h2 ref={tituloFormRef} tabIndex={-1} className="m-0 text-base font-semibold text-navy-900 outline-none">
            {form.id ? `Editar o cupom ${form.codigo}` : 'Novo cupom'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cupom-codigo" className={rotulo}>
                Código
              </label>
              <input
                id="cupom-codigo"
                className={`${campo} uppercase`}
                value={form.codigo}
                onChange={(e) => set('codigo', e.target.value.toUpperCase())}
                onBlur={() => conferir('codigo')}
                autoComplete="off"
                aria-invalid={Boolean(erros.codigo)}
                aria-describedby={erros.codigo ? 'cupom-codigo-erro' : 'cupom-codigo-ajuda'}
              />
              {erros.codigo ? (
                <span id="cupom-codigo-erro" className="text-xs font-semibold text-red-700">
                  {erros.codigo}
                </span>
              ) : (
                <span id="cupom-codigo-ajuda" className="text-xs text-muted">
                  Letras, números e hífen. Ex.: AMIGO21
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cupom-descricao" className={rotulo}>
                Descrição (só para você)
              </label>
              <input
                id="cupom-descricao"
                className={campo}
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
                maxLength={120}
              />
            </div>
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className={`${rotulo} mb-1.5`}>Desconto</legend>
              <div className="flex gap-2">
                <select
                  aria-label="Tipo de desconto"
                  className={`${campo} w-auto`}
                  value={form.tipo}
                  onChange={(e) => set('tipo', e.target.value as Formulario['tipo'])}
                >
                  <option value="percentual">%</option>
                  <option value="valor">R$</option>
                </select>
                <input
                  id="cupom-desconto"
                  aria-label={form.tipo === 'percentual' ? 'Porcentagem de desconto' : 'Valor do desconto em reais'}
                  className={campo}
                  inputMode="decimal"
                  value={form.desconto}
                  onChange={(e) => set('desconto', e.target.value)}
                  onBlur={() => conferir('desconto')}
                  placeholder={form.tipo === 'percentual' ? '20' : '50,00'}
                  aria-invalid={Boolean(erros.desconto)}
                  aria-describedby={erros.desconto ? 'cupom-desconto-erro' : 'cupom-desconto-ajuda'}
                />
              </div>
              {erros.desconto ? (
                <span id="cupom-desconto-erro" className="text-xs font-semibold text-red-700">
                  {erros.desconto}
                </span>
              ) : (
                <span id="cupom-desconto-ajuda" className="text-xs text-muted">
                  100% deixa a adesão grátis.
                </span>
              )}
            </fieldset>
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className={`${rotulo} mb-1.5`}>Vale</legend>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-navy-900">
                  <input type="radio" name="vale" checked={form.vale === 'uma'} onChange={() => set('vale', 'uma')} />
                  Uma vez só
                </label>
                <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-navy-900">
                  <input type="radio" name="vale" checked={form.vale === 'periodo'} onChange={() => set('vale', 'periodo')} />
                  Por um período
                </label>
              </div>
            </fieldset>
            {form.vale === 'periodo' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cupom-inicio" className={rotulo}>
                    Começa em (opcional)
                  </label>
                  <input
                    id="cupom-inicio"
                    type="date"
                    className={campo}
                    value={form.inicio}
                    onChange={(e) => set('inicio', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cupom-fim" className={rotulo}>
                    Termina em (opcional)
                  </label>
                  <input
                    id="cupom-fim"
                    type="date"
                    className={campo}
                    value={form.fim}
                    onChange={(e) => set('fim', e.target.value)}
                    onBlur={() => conferir('fim')}
                    aria-invalid={Boolean(erros.fim)}
                    aria-describedby={erros.fim ? 'cupom-fim-erro' : undefined}
                  />
                  {erros.fim && (
                    <span id="cupom-fim-erro" className="text-xs font-semibold text-red-700">
                      {erros.fim}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cupom-max" className={rotulo}>
                    Limite de usos (opcional)
                  </label>
                  <input
                    id="cupom-max"
                    className={campo}
                    inputMode="numeric"
                    value={form.maxUsos}
                    onChange={(e) => set('maxUsos', e.target.value.replace(/\D/g, ''))}
                    placeholder="Sem limite"
                  />
                </div>
              </>
            )}
            <label className="inline-flex min-h-[44px] items-center gap-2 self-end text-sm text-navy-900">
              <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)} />
              Ligado
            </label>
          </div>
          {erroForm && (
            <p role="alert" className="m-0 text-sm font-semibold text-red-700">
              {erroForm}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={salvando} className={`${primario} disabled:cursor-wait`}>
              {salvando && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {form.id ? 'Salvar cupom' : 'Criar cupom'}
            </button>
            <button type="button" className={btn} onClick={fechar} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <p aria-live="polite" className="m-0 text-sm text-navy-800 empty:hidden">
        {mensagem}
      </p>

      {/* Moldura da lista */}
      <section
        aria-label="Cupons cadastrados"
        className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(26,39,84,0.05)]"
      >
        {/* Barra de ferramentas */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <label htmlFor="cupom-busca" className="hidden text-sm font-semibold text-navy-800 md:block">
            Buscar
          </label>
          <div className="relative min-w-[200px] flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={buscaRef}
              id="cupom-busca"
              type="search"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(1)
              }}
              placeholder="Código ou descrição"
              aria-label="Buscar cupom"
              aria-keyshortcuts="/"
              className="min-h-[44px] w-full rounded-lg border border-line bg-white pl-9 pr-12 text-sm text-navy-900 placeholder:text-muted"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted md:block">
              /
            </kbd>
          </div>
          <span className="text-xs text-muted">Mais novos primeiro</span>
        </div>

        {/* Tabela */}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-surface-50 text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Código</th>
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Desconto</th>
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Situação</th>
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Regra</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold uppercase tracking-wide">Usos</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.length === 0 ? (
                <tr className="border-t border-line">
                  <td colSpan={6} className="px-4 py-10 text-center">
                    {cupons.length === 0 ? (
                      <>
                        <p className="m-0 font-semibold text-navy-900">Nenhum cupom ainda</p>
                        <p className="m-0 mt-1 text-sm text-muted">
                          Crie um cupom para dar desconto na adesão a quem você indicar.
                        </p>
                        {!form && (
                          <button
                            type="button"
                            onClick={(e) => abrir({ ...VAZIO }, e.currentTarget)}
                            className={`${primario} mt-4`}
                          >
                            <Plus aria-hidden className="h-4 w-4" />
                            Criar cupom
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="m-0 font-semibold text-navy-900">Nenhum cupom com “{busca.trim()}”</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBusca('')
                            buscaRef.current?.focus()
                          }}
                          className={`${btn} mt-3`}
                        >
                          Limpar a busca
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                visiveis.map((c) => {
                  const sit = situacao(c)
                  return (
                    <tr key={c.id} className="border-t border-line align-middle">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-navy-900">{c.codigo}</span>
                        {c.descricao && <span className="block text-xs text-muted">{c.descricao}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-navy-900">{desconto(c)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 font-semibold ${sit.valendo ? 'text-emerald-700' : 'text-navy-800'}`}
                        >
                          <span aria-hidden className={`h-2 w-2 rounded-full ${sit.valendo ? 'bg-emerald-600' : 'bg-muted'}`} />
                          {sit.texto}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy-800">{regra(c)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-navy-900">{c.usos}</td>
                      <td className="px-4 py-3">
                        <span className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            className={btn}
                            onClick={(e) => abrir(paraFormulario(c), e.currentTarget)}
                            disabled={ocupado === c.id}
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                            Editar
                          </button>
                          <button type="button" className={btn} onClick={() => ligar(c)} disabled={ocupado === c.id}>
                            <Power aria-hidden className="h-4 w-4" />
                            {c.ativo ? 'Desligar' : 'Ligar'}
                          </button>
                          {c.usos === 0 &&
                            (excluindo === c.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => excluir(c)}
                                  disabled={ocupado === c.id}
                                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800"
                                >
                                  <Trash2 aria-hidden className="h-4 w-4" />
                                  Excluir o cupom {c.codigo}
                                </button>
                                <button type="button" className={btn} onClick={() => setExcluindo('')} autoFocus>
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className={btn}
                                onClick={() => setExcluindo(c.id)}
                                disabled={ocupado === c.id}
                              >
                                <Trash2 aria-hidden className="h-4 w-4" />
                                Excluir
                              </button>
                            ))}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação (sempre visível) */}
        <nav
          aria-label="Paginação"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm"
        >
          <p className="m-0 tabular-nums text-muted">
            {filtrados.length ? `${deIndice + 1}–${deIndice + visiveis.length} de ${filtrados.length}` : '0 cupons'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              className={paginaBtn}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Anterior
            </button>
            <span className="tabular-nums text-muted">
              {paginaAtual} / {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              className={paginaBtn}
            >
              Próxima
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </section>
    </div>
  )
}
