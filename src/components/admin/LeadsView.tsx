'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  ListFilter,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import type { StoredLead } from '@/lib/db'
import { brl } from '@/lib/site'
import { LeadDrawer } from './LeadDrawer'
import { Tooltip } from './Tooltip'
import { STATUS_META, StatusLabel, type LeadStatus } from './lead-status'

const PAGE_SIZE = 25

type SortKey = 'createdAt' | 'nome' | 'mensalidadeFinal'
type Toast = { id: number; text: string; tone: 'ok' | 'error' }

// Neutraliza injeção de fórmula (=, +, -, @) ao abrir o CSV no Excel/Sheets e escapa aspas.
const csvCell = (v: unknown) => {
  const raw = String(v ?? '')
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

const iconBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-navy-800 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted-2'

function SortHeader({
  label,
  k,
  sort,
  onSort,
  align = 'left',
}: {
  label: string
  k: SortKey
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === k
  const Icon = active && sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex min-h-[32px] items-center gap-1 rounded font-semibold uppercase tracking-wide hover:text-navy-900 ${
          active ? 'text-navy-900' : ''
        }`}
      >
        {label}
        <Icon aria-hidden className={`h-3.5 w-3.5 ${active ? '' : 'opacity-0'}`} />
      </button>
    </th>
  )
}

export function LeadsView() {
  const [leads, setLeads] = useState<StoredLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<Set<LeadStatus>>(new Set())
  const [onlyWork, setOnlyWork] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<StoredLead | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const filtersBtnRef = useRef<HTMLButtonElement>(null)

  const notify = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ id: Date.now(), text, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/admin/leads', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/admin/login'
        return
      }
      const data = await res.json()
      if (data.success) setLeads(data.leads || [])
      else setLoadError('Não foi possível carregar os cadastros.')
    } catch {
      setLoadError('Sem conexão com o servidor.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const syncCrm = useCallback(
    async (quiet = false) => {
      setIsSyncing(true)
      try {
        const res = await fetch('/api/admin/crm-sync', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (data.success) {
          if (!quiet) notify(data.message || `${data.imported} cadastros sincronizados com o CRM.`)
          await fetchLeads()
        } else if (!quiet) {
          notify(data.message || data.error || 'Não foi possível sincronizar com o CRM. Tente de novo.', 'error')
        }
      } catch {
        if (!quiet) notify('Sem conexão para sincronizar com o CRM.', 'error')
      } finally {
        setIsSyncing(false)
      }
    },
    [fetchLeads, notify]
  )

  useEffect(() => {
    fetchLeads()
    syncCrm(true)
  }, [fetchLeads, syncCrm])

  // "/" foca a busca (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if (e.key === '/' && !typing && !selected) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])

  // Fecha o painel de filtros com Esc ou clique fora.
  useEffect(() => {
    if (!filtersOpen) return
    const onDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFiltersOpen(false)
        filtersBtnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [filtersOpen])

  const counts = useMemo(() => {
    const c = new Map<LeadStatus, number>()
    for (const l of leads) c.set(l.status, (c.get(l.status) || 0) + 1)
    return c
  }, [leads])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')
    const rows = leads.filter((l) => {
      if (statuses.size && !statuses.has(l.status)) return false
      if (onlyWork && !l.veiculoTrabalho) return false
      if (!term) return true
      return (
        l.nome.toLowerCase().includes(term) ||
        (l.placa || '').toLowerCase().includes(term) ||
        `${l.vehicle.marca} ${l.vehicle.modelo}`.toLowerCase().includes(term) ||
        (!!digits && ((l.cpf || '').replace(/\D/g, '').includes(digits) || l.whatsapp.replace(/\D/g, '').includes(digits)))
      )
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    return rows.sort((a, b) => {
      if (sort.key === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR') * dir
      if (sort.key === 'mensalidadeFinal') return (a.mensalidadeFinal - b.mensalidadeFinal) * dir
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
    })
  }, [leads, search, statuses, onlyWork, sort])

  useEffect(() => setPage(1), [search, statuses, onlyWork, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)
  const activeFilters = statuses.size + (onlyWork ? 1 : 0)

  const toggleStatus = (s: LeadStatus) =>
    setStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })

  const clearFilters = () => {
    setStatuses(new Set())
    setOnlyWork(false)
  }

  const onSort = (k: SortKey) =>
    setSort((prev) => (prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'nome' ? 'asc' : 'desc' }))

  const exportCsv = () => {
    if (!filtered.length) return
    const headers = ['Data/Hora', 'Nome', 'CPF', 'WhatsApp', 'Email', 'Cidade', 'Placa', 'Veículo', 'Ano', 'FIPE', 'Plano', 'Mensalidade', 'Adesão', 'Cupom', 'Adesão sem cupom', 'Status']
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toLocaleString('pt-BR'),
      l.nome,
      l.cpf || '',
      l.whatsapp,
      l.email || '',
      l.cidade || '',
      l.placa || '',
      `${l.vehicle.marca} ${l.vehicle.modelo}`,
      l.vehicle.ano,
      l.vehicle.fipeValue,
      l.planoEscolhidoNome,
      l.mensalidadeFinal,
      l.ativacao,
      l.cupom?.codigo || '',
      l.cupom ? l.ativacaoOriginal ?? '' : '',
      STATUS_META[l.status]?.label || l.status,
    ])
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `cadastros-21go-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notify(`${filtered.length} cadastros exportados.`)
  }

  const statusOptions = (Object.keys(STATUS_META) as LeadStatus[]).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order)

  return (
    <div className="admin-light flex flex-col gap-5">
      {/* Cabeçalho da página */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy-900">Cadastros</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            Leads do site e do CRM 21Go. Clique em um cadastro para ver os detalhes e agir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => syncCrm(false)}
          disabled={isSyncing}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 disabled:cursor-wait disabled:text-muted"
        >
          <RefreshCw aria-hidden className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando…' : 'Sincronizar CRM'}
        </button>
      </div>

      {/* Moldura da lista */}
      <section aria-label="Lista de cadastros" className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(26,39,84,0.05)]">
        {/* Barra de ferramentas */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <label htmlFor="admin-busca" className="hidden text-sm font-semibold text-navy-800 md:block">
            Buscar
          </label>
          <div className="relative min-w-[200px] flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              id="admin-busca"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, placa, CPF ou WhatsApp"
              aria-keyshortcuts="/"
              className="min-h-[44px] w-full rounded-lg border border-line bg-white pl-9 pr-12 text-sm text-navy-900 placeholder:text-muted"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted md:block">
              /
            </kbd>
          </div>

          <div ref={filtersRef} className="relative">
            <button
              ref={filtersBtnRef}
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="admin-filtros"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100"
            >
              <ListFilter aria-hidden className="h-4 w-4" />
              Filtros
              {activeFilters > 0 && (
                <span className="rounded bg-navy-900 px-1.5 text-xs font-semibold text-white">{activeFilters}</span>
              )}
            </button>
            {filtersOpen && (
              <div
                id="admin-filtros"
                role="group"
                aria-label="Filtros"
                className="absolute right-0 z-20 mt-2 w-[min(320px,calc(100vw-32px))] rounded-xl border border-line bg-white p-3 shadow-[0_8px_24px_rgba(26,39,84,0.08)]"
              >
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Status</legend>
                  {statusOptions.map((s) => (
                    <label key={s} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-surface-50">
                      <input
                        type="checkbox"
                        checked={statuses.has(s)}
                        onChange={() => toggleStatus(s)}
                        className="h-4 w-4 accent-navy-900"
                      />
                      <span className="flex-1">
                        <StatusLabel status={s} />
                      </span>
                      <span className="text-xs tabular-nums text-muted">{counts.get(s) || 0}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="my-2 border-t border-line" />
                <label className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-1 text-sm text-navy-800 hover:bg-surface-50">
                  <input type="checkbox" checked={onlyWork} onChange={(e) => setOnlyWork(e.target.checked)} className="h-4 w-4 accent-navy-900" />
                  Só veículos de app ou táxi
                </label>
                <div className="mt-2 flex justify-between border-t border-line pt-2">
                  <button type="button" onClick={clearFilters} disabled={!activeFilters} className="min-h-[40px] rounded-lg px-2 text-sm font-semibold text-navy-700 hover:bg-surface-100 disabled:text-muted">
                    Limpar filtros
                  </button>
                  <button type="button" onClick={() => { setFiltersOpen(false); filtersBtnRef.current?.focus() }} className="min-h-[40px] rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white hover:bg-navy-800">
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          <Tooltip label="Exportar CSV">
            <button type="button" onClick={exportCsv} disabled={!filtered.length} aria-label="Exportar CSV" className={iconBtn}>
              <Download aria-hidden className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="Atualizar lista">
            <button type="button" onClick={fetchLeads} disabled={isLoading} aria-label="Atualizar lista" className={iconBtn}>
              <RefreshCw aria-hidden className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
        </div>

        {/* Filtros ativos */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            {[...statuses].map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-50 py-0.5 pl-2 pr-0.5 text-xs text-navy-800">
                Status: {STATUS_META[s]?.label}
                <button type="button" onClick={() => toggleStatus(s)} aria-label={`Remover filtro ${STATUS_META[s]?.label}`} className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-100">
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {onlyWork && (
              <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-50 py-0.5 pl-2 pr-0.5 text-xs text-navy-800">
                App ou táxi
                <button type="button" onClick={() => setOnlyWork(false)} aria-label="Remover filtro app ou táxi" className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-100">
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="min-h-[32px] px-1 text-xs font-semibold text-navy-700 underline-offset-2 hover:underline">
              Limpar tudo
            </button>
          </div>
        )}

        {/* Tabela */}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-surface-50 text-xs text-muted [&_th]:font-semibold">
              <tr>
                <SortHeader label="Cliente" k="nome" sort={sort} onSort={onSort} />
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Veículo</th>
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Plano</th>
                <SortHeader label="Mensalidade" k="mensalidadeFinal" sort={sort} onSort={onSort} align="right" />
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                <SortHeader label="Data" k="createdAt" sort={sort} onSort={onSort} />
                <th scope="col" className="w-10 px-2 py-3">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !leads.length ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-line" aria-hidden>
                    {[40, 32, 16, 14, 20, 14, 4].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3.5 animate-pulse rounded bg-surface-100" style={{ width: `${w * 4}px`, maxWidth: '100%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" role="alert">
                    <p className="m-0 font-semibold text-navy-900">{loadError}</p>
                    <button type="button" onClick={fetchLeads} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-navy-800 hover:bg-surface-100">
                      <RefreshCw aria-hidden className="h-4 w-4" />
                      Tentar de novo
                    </button>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Inbox aria-hidden className="mx-auto h-6 w-6 text-muted" />
                    {leads.length ? (
                      <>
                        <p className="m-0 mt-2 font-semibold text-navy-900">Nenhum cadastro com essa busca ou filtros</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('')
                            clearFilters()
                          }}
                          className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-line px-4 text-sm font-semibold text-navy-800 hover:bg-surface-100"
                        >
                          Limpar busca e filtros
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="m-0 mt-2 font-semibold text-navy-900">Nenhum cadastro ainda</p>
                        <p className="m-0 mt-1 text-sm text-muted">As simulações feitas no site aparecem aqui automaticamente.</p>
                        <button
                          type="button"
                          onClick={() => syncCrm(false)}
                          disabled={isSyncing}
                          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-navy-800 hover:bg-surface-100"
                        >
                          <RefreshCw aria-hidden className="h-4 w-4" />
                          Buscar cadastros no CRM
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="group cursor-pointer border-t border-line transition-colors hover:bg-surface-50"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(lead)
                        }}
                        className="rounded text-left font-semibold text-navy-600 underline-offset-2 group-hover:underline"
                      >
                        {lead.nome || <span className="text-muted">Aguardando documentos</span>}
                      </button>
                      <div className="text-xs text-muted">{lead.whatsapp}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-navy-900">
                        {lead.vehicle.marca} {lead.vehicle.modelo} <span className="text-muted">{lead.vehicle.ano}</span>
                      </div>
                      <div className="font-mono text-xs text-muted">
                        {lead.placa || 'Sem placa'}
                        {lead.veiculoTrabalho ? ' · app/táxi' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-900">{lead.planoEscolhidoNome}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      <div className="text-navy-900">{brl(lead.mensalidadeFinal)}</div>
                      <div className="text-xs text-muted">
                        adesão {brl(lead.ativacao)}
                        {lead.cupom ? ` · cupom ${lead.cupom.codigo}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusLabel status={lead.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                      {new Date(lead.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-2 py-3 text-muted">
                      <ChevronRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação (sempre visível) */}
        <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm">
          <p className="m-0 tabular-nums text-muted" aria-live="polite">
            {filtered.length ? `${from}–${to} de ${filtered.length}` : '0 cadastros'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-line px-3 font-semibold text-navy-800 hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Anterior
            </button>
            <span className="tabular-nums text-muted">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-line px-3 font-semibold text-navy-800 hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted"
            >
              Próxima
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </section>

      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          notify={notify}
          onApproved={async () => {
            await fetchLeads()
            setSelected((s) => (s ? { ...s, status: 'aprovado' } : s))
          }}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-md rounded-lg px-4 py-3 text-sm font-semibold shadow-[0_8px_24px_rgba(7,12,34,0.08)] ${
              toast.tone === 'error' ? 'bg-red-700 text-white' : 'bg-navy-900 text-white'
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  )
}
