'use client'

import React, { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { brl } from '@/lib/site'

export function LucroSimulator() {
  const [vendasMes, setVendasMes] = useState<number>(10)
  const [taxaAtivacao, setTaxaAtivacao] = useState<number>(399.99)
  const [mensalidadeMedia, setMensalidadeMedia] = useState<number>(195.0)
  const [percentualRecorrencia, setPercentualRecorrencia] = useState<number>(10) // 10% de comissão recorrente
  const [churnMensal, setChurnMensal] = useState<number>(2) // 2% de cancelamento ao mês

  // Cálculos financeiros
  const receitaEntradaMes = vendasMes * taxaAtivacao
  const comissaoRecorrentePorCarro = (mensalidadeMedia * percentualRecorrencia) / 100

  // Projeção mês a mês para 12 meses
  interface MesProjecao {
    mes: number
    novasVendas: number
    baseAtiva: number
    receitaEntrada: number
    receitaRecorrente: number
    totalMes: number
  }

  const projecao: MesProjecao[] = []
  let baseAcumulada = 0
  let faturamentoTotalAno = 0
  let recorrenciaTotalAno = 0
  let entradaTotalAno = 0

  for (let m = 1; m <= 12; m++) {
    // Churn sobre a base anterior
    const cancelamentos = Math.floor(baseAcumulada * (churnMensal / 100))
    baseAcumulada = baseAcumulada - cancelamentos + vendasMes
    const recMes = baseAcumulada * comissaoRecorrentePorCarro
    const totalMes = receitaEntradaMes + recMes

    projecao.push({
      mes: m,
      novasVendas: vendasMes,
      baseAtiva: baseAcumulada,
      receitaEntrada: receitaEntradaMes,
      receitaRecorrente: recMes,
      totalMes,
    })

    faturamentoTotalAno += totalMes
    recorrenciaTotalAno += recMes
    entradaTotalAno += receitaEntradaMes
  }

  const baseFinal12Meses = projecao[11]?.baseAtiva || 0
  const receitaMensalNoMes12 = projecao[11]?.totalMes || 0
  const recorrenciaMensalNoMes12 = projecao[11]?.receitaRecorrente || 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-center gap-2.5 text-2xl font-extrabold text-navy-800">
          <TrendingUp className="h-6 w-6 text-go-orange" />
          Simulador de Lucro & Comissões da Franquia
        </h2>
        <p className="m-0 text-sm text-muted">
          Projeção financeira baseada no modelo de negócio oficial da 21Go: taxa de adesão imediata
          + comissão recorrente mensal sobre a carteira ativa.
        </p>
      </div>

      {/* Controles de Parâmetros */}
      <div className="grid grid-cols-1 gap-5 rounded-2xl border border-line bg-white p-6 shadow-card md:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Vendas novas / mês
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={200}
              value={vendasMes}
              onChange={(e) => setVendasMes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-xl border border-line bg-surface-50 px-3.5 py-2.5 font-bold text-navy-800 focus:border-go-orange focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-muted">Ex: 5, 10, 20 contratos/mês</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Taxa de Ativação (Adesão)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={10}
              value={taxaAtivacao}
              onChange={(e) => setTaxaAtivacao(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-line bg-surface-50 px-3.5 py-2.5 font-bold text-navy-800 focus:border-go-orange focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-muted">Padrão da rede: R$ 399,99</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Mensalidade Média
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={50}
              step={10}
              value={mensalidadeMedia}
              onChange={(e) => setMensalidadeMedia(Math.max(50, Number(e.target.value) || 50))}
              className="w-full rounded-xl border border-line bg-surface-50 px-3.5 py-2.5 font-bold text-navy-800 focus:border-go-orange focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-muted">Ticket médio dos planos</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Comissão Recorrente (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={percentualRecorrencia}
              onChange={(e) => setPercentualRecorrencia(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-xl border border-line bg-surface-50 px-3.5 py-2.5 font-bold text-navy-800 focus:border-go-orange focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-muted">
            {brl(comissaoRecorrentePorCarro)} / carro / mês
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Taxa de Churn (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={15}
              value={churnMensal}
              onChange={(e) => setChurnMensal(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-line bg-surface-50 px-3.5 py-2.5 font-bold text-navy-800 focus:border-go-orange focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-muted">Cancelamento mensal médio</span>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Entrada Imediata / Mês</span>
            <DollarSign className="h-4 w-4 text-go-orange" />
          </div>
          <p className="m-0 mt-2 text-3xl font-extrabold text-navy-800">
            {brl(receitaEntradaMes)}
          </p>
          <span className="text-xs text-muted">
            {vendasMes} adesões × {brl(taxaAtivacao)}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Carteira em 12 Meses</span>
            <Users className="h-4 w-4 text-go-lime-dark" />
          </div>
          <p className="m-0 mt-2 text-3xl font-extrabold text-go-lime-dark">
            {baseFinal12Meses} veículos
          </p>
          <span className="text-xs text-muted">
            Clientes ativos protegidos pela sua franquia
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Recorrência no Mês 12</span>
            <TrendingUp className="h-4 w-4 text-go-orange-dark" />
          </div>
          <p className="m-0 mt-2 text-3xl font-extrabold text-go-orange-dark">
            {brl(recorrenciaMensalNoMes12)}
            <span className="text-base font-normal text-muted">/mês</span>
          </p>
          <span className="text-xs text-muted">Renda passiva mensal sem novas vendas</span>
        </div>

        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-navy-950 p-5 text-white shadow-card">
          <div className="flex items-center justify-between text-go-lime">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Anual</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="m-0 mt-2 text-3xl font-extrabold text-white">
            {brl(faturamentoTotalAno)}
          </p>
          <span className="text-xs text-muted-soft">
            Entradas ({brl(entradaTotalAno)}) + Recorrente ({brl(recorrenciaTotalAno)})
          </span>
        </div>
      </div>

      {/* Tabela de Evolução 12 Meses */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="border-b border-line p-5">
          <h3 className="m-0 text-base font-extrabold text-navy-800">
            Evolução Mês a Mês da Sua Carteira 21Go
          </h3>
          <p className="m-0 text-xs text-muted">
            Acompanhe o crescimento composto da receita recorrente somada às adesões mensais.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-50 text-xs font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3.5">Mês</th>
                <th className="px-5 py-3.5">Novas Vendas</th>
                <th className="px-5 py-3.5">Base Ativa</th>
                <th className="px-5 py-3.5">Receita Entrada</th>
                <th className="px-5 py-3.5">Receita Recorrente</th>
                <th className="px-5 py-3.5 text-right font-extrabold text-navy-800">
                  Total no Mês
                </th>
              </tr>
            </thead>
            <tbody>
              {projecao.map((p) => (
                <tr
                  key={p.mes}
                  className="border-b border-line/60 transition hover:bg-surface-50"
                >
                  <td className="px-5 py-3.5 font-bold text-navy-800">Mês {p.mes}</td>
                  <td className="px-5 py-3.5 text-muted">+{p.novasVendas} carros</td>
                  <td className="px-5 py-3.5 font-semibold text-navy-800">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-bold">
                      {p.baseAtiva} ativos
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-navy-800">
                    {brl(p.receitaEntrada)}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-go-lime-dark">
                    +{brl(p.receitaRecorrente)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-extrabold text-navy-800">
                    {brl(p.totalMes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
