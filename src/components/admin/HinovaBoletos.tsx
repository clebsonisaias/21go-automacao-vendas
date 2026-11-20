'use client'

import React, { useState } from 'react'
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Phone,
  ShieldAlert,
} from 'lucide-react'
import { brl } from '@/lib/site'

interface BoletoRecord {
  nossoNumero: string
  placa: string
  associado: string
  valor: number
  vencimento: string
  status: 'pago' | 'aguardando' | 'cancelado' | 'exige_revistoria'
  linhaDigitavel?: string
  donoFontePower?: string
}

export function HinovaBoletos() {
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<BoletoRecord | null>(null)
  const [copiado, setCopiado] = useState(false)

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!busca.trim()) return

    setBuscando(true)
    setTimeout(() => {
      // Simulação baseada na consulta do SGA Hinova
      setResultado({
        nossoNumero: '21948201948',
        placa: busca.toUpperCase().trim(),
        associado: 'CHRISTIAN ARAUJO PINHEIRO DE LUCENA',
        valor: 195.0,
        vencimento: '10/12/2026',
        status: 'aguardando',
        linhaDigitavel: '23793.38128 60000.123456 78000.123456 1 99990000019500',
        donoFontePower: 'Clebson Isaías (CITmax)',
      })
      setBuscando(false)
    }, 600)
  }

  const handleCopiarLinha = () => {
    if (!resultado?.linhaDigitavel) return
    navigator.clipboard.writeText(resultado.linhaDigitavel)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-center gap-2.5 text-2xl font-extrabold text-navy-800">
          <FileText className="h-6 w-6 text-go-orange" />
          Consulta de Boletos Hinova SGA
        </h2>
        <p className="m-0 text-sm text-muted">
          Verificação de status em tempo real integrada com a base do ERP Hinova SGA da 21Go.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <form onSubmit={handleBuscar} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite a placa (ex: RGL9B19) ou Nosso Número"
              className="w-full rounded-xl border border-line bg-surface-50 pl-10 pr-4 py-3 font-bold text-navy-800 placeholder:font-normal placeholder:text-muted focus:border-go-orange focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={buscando || !busca.trim()}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-navy-950 px-6 font-bold text-white transition hover:bg-navy-900 disabled:opacity-50"
          >
            {buscando ? 'Consultando SGA…' : 'Consultar no SGA'}
          </button>
        </form>

        {resultado && (
          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-line bg-surface-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase text-muted">Associado Hinova</span>
                <p className="m-0 text-base font-extrabold text-navy-800">{resultado.associado}</p>
              </div>

              <div>
                {resultado.status === 'pago' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    PAGO NO SGA
                  </span>
                ) : resultado.status === 'cancelado' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                    <XCircle className="h-4 w-4 text-red-600" />
                    CANCELADO NO SGA
                  </span>
                ) : resultado.status === 'exige_revistoria' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    EXIGE REVISTORIA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    AGUARDANDO PAGAMENTO
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <span className="text-xs text-muted">Placa</span>
                <p className="m-0 font-bold text-navy-800">{resultado.placa}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Valor</span>
                <p className="m-0 font-bold text-navy-800">{brl(resultado.valor)}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Vencimento</span>
                <p className="m-0 font-bold text-navy-800">{resultado.vencimento}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Consultor (Power)</span>
                <p className="m-0 font-bold text-navy-800">{resultado.donoFontePower}</p>
              </div>
            </div>

            {resultado.linhaDigitavel && (
              <div className="flex flex-col gap-2 rounded-lg bg-white p-3 border border-line/60">
                <span className="text-xs font-bold text-muted">Linha Digitável / Código de Barras:</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-navy-900 break-all">
                    {resultado.linhaDigitavel}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopiarLinha}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1 text-xs font-bold text-navy-800 hover:bg-surface-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://sga.hinova.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-go-orange px-4 text-xs font-bold text-navy-950 transition hover:bg-go-orange-dark"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir PDF direto da Hinova
              </a>
              <span className="text-xs text-muted">
                Em caso de dúvidas financeiras, acione a matriz da 21Go: 0800 234 5555
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
