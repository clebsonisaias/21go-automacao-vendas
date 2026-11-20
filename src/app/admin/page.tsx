'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Search,
  CheckCircle2,
  Clock,
  Car,
  FileText,
  User,
  Phone,
  Calendar,
  DollarSign,
  Download,
  AlertCircle,
  Eye,
  X,
  MapPin,
} from 'lucide-react'
import { StoredLead } from '@/lib/db'

export default function AdminPage() {
  const [leads, setLeads] = useState<StoredLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState<StoredLead | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/leads')
      const data = await res.json()
      if (data.success) {
        setLeads(data.leads || [])
      }
    } catch (err) {
      console.error('Erro ao buscar leads:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLeads = leads.filter((l) => {
    const term = searchTerm.toLowerCase()
    return (
      l.nome.toLowerCase().includes(term) ||
      (l.cpf && l.cpf.includes(term)) ||
      (l.placa && l.placa.toLowerCase().includes(term)) ||
      l.whatsapp.includes(term) ||
      (l.vehicle.marca + ' ' + l.vehicle.modelo).toLowerCase().includes(term)
    )
  })

  // Exportar CSV
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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads_21go_backup_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-brand-500/25">
              21
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Painel de Backup de Cadastros
                <span className="text-xs bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Online
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Histórico e backup independente de todos os leads e vistorias digitais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={fetchLeads}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20"
            >
              Atualizar
            </button>
          </div>
        </header>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total de Cadastros</span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">{leads.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-amber-400 font-semibold uppercase">Aguardando Vistoria</span>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {leads.filter((l) => l.status === 'pendente_vistoria').length}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-emerald-400 font-semibold uppercase">Vistorias Enviadas</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {leads.filter((l) => l.status === 'vistoria_enviada').length}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-brand-400 font-semibold uppercase">Veículos de App / Táxi</span>
            <p className="text-2xl sm:text-3xl font-black text-brand-400 mt-1">
              {leads.filter((l) => l.veiculoTrabalho).length}
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, placa, CPF, modelo ou WhatsApp..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm focus:border-brand-500 focus:outline-none text-white placeholder:text-slate-500"
          />
        </div>

        {/* Tabela de Leads */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4">Data</th>
                  <th className="py-4 px-4">Cliente</th>
                  <th className="py-4 px-4">Veículo / Placa</th>
                  <th className="py-4 px-4">Plano</th>
                  <th className="py-4 px-4">Mensalidade</th>
                  <th className="py-4 px-4">Status Vistoria</th>
                  <th className="py-4 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Carregando cadastros de backup...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">
                      Nenhum cadastro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(lead.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div>{lead.nome}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {lead.whatsapp} {lead.cpf ? `• CPF: ${lead.cpf}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {lead.vehicle.marca} {lead.vehicle.modelo} ({lead.vehicle.ano})
                        </div>
                        <div className="text-[11px] text-brand-400 font-mono">
                          {lead.placa || 'Sem placa'} {lead.veiculoTrabalho ? '• Trabalho/App' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-300">
                        {lead.planoEscolhidoNome}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-emerald-400">
                          R$ {lead.mensalidadeFinal.toFixed(2).replace('.', ',')}/mês
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Ativação: R$ {lead.ativacao.toFixed(2).replace('.', ',')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {lead.status === 'vistoria_enviada' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Vistoria Enviada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" />
                            Pendente Vistoria
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-semibold text-xs transition border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Detalhes do Lead */}
        {selectedLead && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          >
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                  Ficha do Associado (Backup)
                </span>
                <h2 className="text-2xl font-black text-white mt-1">{selectedLead.nome}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cadastrado em {new Date(selectedLead.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Dados Pessoais */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-brand-400" />
                    Dados do Titular
                  </h3>
                  <p><strong>Nome:</strong> {selectedLead.nome}</p>
                  <p><strong>CPF:</strong> {selectedLead.cpf || 'Não informado'}</p>
                  <p><strong>WhatsApp:</strong> {selectedLead.whatsapp}</p>
                  <p><strong>E-mail:</strong> {selectedLead.email || 'Não informado'}</p>
                  <p><strong>Cidade:</strong> {selectedLead.cidade || 'Rio de Janeiro'}</p>
                </div>

                {/* Dados do Veículo */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-brand-400" />
                    Dados do Veículo
                  </h3>
                  <p><strong>Modelo:</strong> {selectedLead.vehicle.marca} {selectedLead.vehicle.modelo} ({selectedLead.vehicle.ano})</p>
                  <p><strong>Placa:</strong> {selectedLead.placa || 'A informar'}</p>
                  <p><strong>Código FIPE:</strong> {selectedLead.vehicle.fipeCode}</p>
                  <p><strong>Valor FIPE:</strong> R$ {selectedLead.vehicle.fipeValue.toLocaleString('pt-BR')}</p>
                  <p><strong>Uso em Aplicativo/Táxi:</strong> {selectedLead.veiculoTrabalho ? 'Sim' : 'Não'}</p>
                </div>

                {/* Plano e Valores */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Plano e Condições
                  </h3>
                  <p><strong>Plano Escolhido:</strong> {selectedLead.planoEscolhidoNome}</p>
                  <p><strong>Mensalidade:</strong> R$ {selectedLead.mensalidadeFinal.toFixed(2).replace('.', ',')}/mês</p>
                  <p><strong>Taxa de Ativação (Pix):</strong> R$ {selectedLead.ativacao.toFixed(2).replace('.', ',')}</p>
                  <p><strong>Desconto Adesivo 21Go:</strong> {selectedLead.comAdesivo ? 'Aplicado' : 'Não aplicado'}</p>
                  {selectedLead.powercrmCode && (
                    <p><strong>Código PowerCRM:</strong> <code>{selectedLead.powercrmCode}</code></p>
                  )}
                </div>

                {/* Status da Vistoria */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Documentos e Vistoria
                  </h3>
                  {selectedLead.vistoriaData ? (
                    <div className="space-y-1 text-slate-300">
                      <p><strong>CNH / RG:</strong> ✅ {selectedLead.vistoriaData.cnhOuRgNome || 'Anexado'}</p>
                      <p><strong>Documento do Veículo (CRLV):</strong> ✅ {selectedLead.vistoriaData.crlvNome || 'Anexado'}</p>
                      <p><strong>Comprovante de Residência:</strong> ✅ {selectedLead.vistoriaData.comprovanteResidenciaNome || 'Anexado'}</p>
                      <p><strong>Total de Fotos do Veículo:</strong> ✅ {selectedLead.vistoriaData.totalFotos || 0} fotos</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Enviado em: {new Date(selectedLead.vistoriaData.enviadoEm || '').toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-amber-400">
                      O associado ainda não enviou as fotos e documentos na página de vistoria.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <a
                  href={`https://wa.me/${selectedLead.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition text-center text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Chamar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
