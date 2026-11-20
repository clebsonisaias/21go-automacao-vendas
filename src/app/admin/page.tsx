'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import {
  CheckCircle2,
  Clock,
  Download,
  DollarSign,
  Eye,
  FileText,
  LogOut,
  MessageCircle,
  Search,
  User,
  Car,
  X,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StoredLead } from '@/lib/db'
import { brl } from '@/lib/site'

const STATUS: Record<StoredLead['status'], { label: string; cls: string; icon: LucideIcon }> = {
  vistoria_enviada: { label: 'Vistoria enviada', cls: 'bg-[#eef3b8] text-[#3d5200]', icon: CheckCircle2 },
  pendente_vistoria: { label: 'Aguardando vistoria', cls: 'bg-[#fdebd0] text-[#8a4a00]', icon: Clock },
  aprovado: { label: 'Aprovado', cls: 'bg-[#d9f2e3] text-[#0f6a35]', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', cls: 'bg-[#fde2e2] text-[#a11d1d]', icon: XCircle },
}

function StatusBadge({ status }: { status: StoredLead['status'] }) {
  const s = STATUS[status] ?? STATUS.pendente_vistoria
  const Icon = s.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {s.label}
    </span>
  )
}

// Neutraliza injeção de fórmula (=, +, -, @) ao abrir o CSV no Excel/Sheets e escapa aspas.
const csvCell = (v: unknown) => {
  const raw = String(v ?? '')
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

function DetailGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-surface-100 p-4">
      <h3 className="m-0 mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-muted">
        <Icon aria-hidden className="h-4 w-4" />
        {title}
      </h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">{children}</dl>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words font-semibold text-navy-800">{children}</dd>
    </>
  )
}

export default function AdminPage() {
  const [leads, setLeads] = useState<StoredLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState<StoredLead | null>(null)

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/admin/leads')
      const data = await res.json()
      if (data.success) {
        setLeads(data.leads || [])
      } else {
        setLoadError('Não foi possível carregar os cadastros.')
      }
    } catch (err) {
      console.error('Erro ao buscar leads:', err)
      setLoadError('Sem conexão com o servidor. Tente atualizar.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    if (!selectedLead) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedLead(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedLead])

  const term = searchTerm.toLowerCase()
  const filteredLeads = leads.filter(
    (l) =>
      l.nome.toLowerCase().includes(term) ||
      (l.cpf && l.cpf.includes(term)) ||
      (l.placa && l.placa.toLowerCase().includes(term)) ||
      l.whatsapp.includes(term) ||
      (l.vehicle.marca + ' ' + l.vehicle.modelo).toLowerCase().includes(term)
  )

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      window.location.assign('/admin/login')
    }
  }

  const handleExportCsv = () => {
    if (!leads.length) return
    const headers = [
      'Data/Hora',
      'Nome',
      'CPF',
      'WhatsApp',
      'Email',
      'Cidade',
      'Placa',
      'Veículo',
      'Ano',
      'FIPE',
      'Plano',
      'Mensalidade',
      'Ativacao',
      'Status',
    ]
    const rows = leads.map((l) => [
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
      l.status,
    ])
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leads_21go_backup_${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const stats: { label: string; value: number; accent?: string }[] = [
    { label: 'Total de cadastros', value: leads.length },
    {
      label: 'Aguardando vistoria',
      value: leads.filter((l) => l.status === 'pendente_vistoria').length,
      accent: 'text-go-orange-dark',
    },
    {
      label: 'Vistorias enviadas',
      value: leads.filter((l) => l.status === 'vistoria_enviada').length,
      accent: 'text-go-lime-dark',
    },
    { label: 'Veículos de app ou táxi', value: leads.filter((l) => l.veiculoTrabalho).length },
  ]

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-navy-line bg-navy-950">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-21go.png"
              alt="21Go"
              width={48}
              height={48}
              className="rounded-xl object-cover"
              priority
            />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight text-white">Painel da franquia</span>
              <span className="text-[11px] font-bold tracking-[1.5px] text-go-lime">USO INTERNO</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!leads.length}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-navy-500 px-4 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download aria-hidden className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              type="button"
              onClick={fetchLeads}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-go-orange px-5 text-[15px] font-bold text-navy-950 transition hover:-translate-y-px hover:shadow-cta"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair do painel"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-navy-500 px-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800"
            >
              <LogOut aria-hidden className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-16 pt-10">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[32px] font-extrabold tracking-[-1px]">Cadastros recebidos</h1>
          <p className="m-0 text-base text-muted">
            Histórico e backup independente de todos os leads e vistorias digitais.
          </p>
        </div>

        <section aria-label="Resumo" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <p className="m-0 text-sm text-muted">{s.label}</p>
              <p className={`m-0 mt-2 text-4xl font-extrabold tracking-tight ${s.accent ?? 'text-navy-800'}`}>
                {s.value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center">
            <label htmlFor="busca" className="text-sm font-bold">
              Buscar
            </label>
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-2"
              />
              <input
                id="busca"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cliente, placa, CPF, modelo ou WhatsApp"
                className="min-h-[48px] w-full rounded-lg border border-[#c9d1e6] bg-white pl-11 pr-3.5 text-base text-navy-800 placeholder:text-muted-2"
              />
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-[1.5px] text-muted">
                  <th scope="col" className="px-5 py-4">Data</th>
                  <th scope="col" className="px-5 py-4">Cliente</th>
                  <th scope="col" className="px-5 py-4">Veículo / placa</th>
                  <th scope="col" className="px-5 py-4">Plano</th>
                  <th scope="col" className="px-5 py-4">Mensalidade</th>
                  <th scope="col" className="px-5 py-4">Status</th>
                  <th scope="col" className="px-5 py-4 text-right">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted">
                      Carregando cadastros…
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-red-700" role="alert">
                      {loadError}
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted">
                      {leads.length
                        ? 'Nenhum cadastro corresponde à busca.'
                        : 'Nenhum cadastro recebido ainda.'}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-t border-line transition hover:bg-surface-50">
                      <td className="whitespace-nowrap px-5 py-4 text-muted">
                        {new Date(lead.createdAt).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-navy-800">{lead.nome}</div>
                        <div className="text-xs text-muted">
                          {lead.whatsapp}
                          {lead.cpf ? ` · CPF ${lead.cpf}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-navy-800">
                          {lead.vehicle.marca} {lead.vehicle.modelo} ({lead.vehicle.ano})
                        </div>
                        <div className="font-mono text-xs text-muted">
                          {lead.placa || 'Sem placa'}
                          {lead.veiculoTrabalho ? ' · App/táxi' : ''}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold">{lead.planoEscolhidoNome}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-bold text-navy-800">{brl(lead.mensalidadeFinal)}/mês</div>
                        <div className="text-xs text-muted">Ativação {brl(lead.ativacao)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          aria-label={`Ver detalhes de ${lead.nome}`}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border-2 border-navy-800 px-4 text-sm font-bold text-navy-800 transition hover:bg-surface-100"
                        >
                          <Eye aria-hidden className="h-4 w-4" />
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLead(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/70 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 text-navy-800 shadow-[0_24px_64px_rgba(7,12,34,0.45)] sm:p-8">
            <button
              type="button"
              onClick={() => setSelectedLead(null)}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface-100"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>

            <div className="mb-5 flex flex-col items-start gap-2 pr-10">
              <StatusBadge status={selectedLead.status} />
              <h2 id="lead-title" className="m-0 text-[28px] font-extrabold tracking-[-0.8px]">
                {selectedLead.nome}
              </h2>
              <p className="m-0 text-sm text-muted">
                Cadastrado em {new Date(selectedLead.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <DetailGroup icon={User} title="Titular">
                <Row label="CPF">{selectedLead.cpf || 'Não informado'}</Row>
                <Row label="WhatsApp">{selectedLead.whatsapp}</Row>
                <Row label="E-mail">{selectedLead.email || 'Não informado'}</Row>
                <Row label="Cidade">{selectedLead.cidade || 'Não informada'}</Row>
              </DetailGroup>

              <DetailGroup icon={Car} title="Veículo">
                <Row label="Modelo">
                  {selectedLead.vehicle.marca} {selectedLead.vehicle.modelo} ({selectedLead.vehicle.ano})
                </Row>
                <Row label="Placa">{selectedLead.placa || 'A informar'}</Row>
                <Row label="FIPE">
                  R$ {selectedLead.vehicle.fipeValue.toLocaleString('pt-BR')} · cód.{' '}
                  {selectedLead.vehicle.fipeCode}
                </Row>
                <Row label="App ou táxi">{selectedLead.veiculoTrabalho ? 'Sim' : 'Não'}</Row>
              </DetailGroup>

              <DetailGroup icon={DollarSign} title="Plano e condições">
                <Row label="Plano">{selectedLead.planoEscolhidoNome}</Row>
                <Row label="Mensalidade">{brl(selectedLead.mensalidadeFinal)}/mês</Row>
                <Row label="Ativação (Pix)">{brl(selectedLead.ativacao)}</Row>
                <Row label="Adesivo 21Go">{selectedLead.comAdesivo ? 'Aplicado' : 'Não aplicado'}</Row>
                {selectedLead.powercrmCode && (
                  <Row label="Código CRM">
                    <code>{selectedLead.powercrmCode}</code>
                  </Row>
                )}
              </DetailGroup>

              <DetailGroup icon={FileText} title="Documentos e vistoria">
                {selectedLead.vistoriaData ? (
                  <>
                    <Row label="CNH / RG">{selectedLead.vistoriaData.cnhOuRgNome || 'Anexado'}</Row>
                    <Row label="CRLV">{selectedLead.vistoriaData.crlvNome || 'Anexado'}</Row>
                    <Row label="Residência">
                      {selectedLead.vistoriaData.comprovanteResidenciaNome || 'Anexado'}
                    </Row>
                    <Row label="Fotos">{selectedLead.vistoriaData.totalFotos || 0} do veículo</Row>
                    {selectedLead.vistoriaData.enviadoEm && (
                      <Row label="Enviado em">
                        {new Date(selectedLead.vistoriaData.enviadoEm).toLocaleString('pt-BR')}
                      </Row>
                    )}
                  </>
                ) : (
                  <>
                    <dt className="sr-only">Situação</dt>
                    <dd className="col-span-2 m-0 text-[#8a4a00]">
                      O associado ainda não enviou documentos e fotos na página de vistoria.
                    </dd>
                  </>
                )}
              </DetailGroup>
            </div>

            <a
              href={`https://wa.me/${selectedLead.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-go-whatsapp-dark text-base font-bold text-white no-underline transition hover:-translate-y-px hover:shadow-cta-wa"
            >
              <MessageCircle aria-hidden className="h-5 w-5" />
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
