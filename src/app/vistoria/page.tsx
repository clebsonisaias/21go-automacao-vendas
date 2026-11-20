'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Camera,
  FileText,
  CheckCircle2,
  Shield,
  ArrowRight,
  Car,
  Home,
  UserCheck,
} from 'lucide-react'

function VistoriaContent() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') || ''
  const nome = searchParams.get('nome') || 'Associado'
  const placa = searchParams.get('placa') || ''
  const veiculo = searchParams.get('veiculo') || 'Veículo'

  // Documentos Obrigatórios
  const [cnhOuRg, setCnhOuRg] = useState<File | null>(null)
  const [crlv, setCrlv] = useState<File | null>(null)
  const [comprovanteResidencia, setComprovanteResidencia] = useState<File | null>(null)

  // Fotos do Carro
  const [fotoFrente, setFotoFrente] = useState<File | null>(null)
  const [fotoTraseira, setFotoTraseira] = useState<File | null>(null)
  const [fotoLatDir, setFotoLatDir] = useState<File | null>(null)
  const [fotoLatEsq, setFotoLatEsq] = useState<File | null>(null)
  const [fotoPainel, setFotoPainel] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cnhOuRg || !crlv || !comprovanteResidencia) {
      alert('Por favor, anexe a CNH (ou RG), o documento do veículo e o comprovante de residência.')
      return
    }

    setIsSubmitting(true)

    const fotosCount = [fotoFrente, fotoTraseira, fotoLatDir, fotoLatEsq, fotoPainel].filter(
      Boolean
    ).length

    try {
      const res = await fetch('/api/vistoria/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref,
          nome,
          placa,
          veiculo,
          cnhOuRgNome: cnhOuRg?.name,
          crlvNome: crlv?.name,
          comprovanteResidenciaNome: comprovanteResidencia?.name,
          totalFotos: fotosCount,
        }),
      })

      if (res.ok) {
        setIsSubmitted(true)
      } else {
        alert('Erro ao enviar vistoria. Tente novamente.')
      }
    } catch {
      alert('Falha de conexão ao enviar vistoria.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-bold text-brand-400 mb-3">
            <Shield className="w-4 h-4" />
            21Go Proteção Veicular — Vistoria & Documentação
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Envio de Documentos e Vistoria
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Envie fotos nítidas dos documentos e do veículo para ativação da proteção.
          </p>

          <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Titular: <strong className="text-white">{nome}</strong></p>
              <p className="text-sm font-bold text-white mt-0.5">{veiculo} {placa ? `• ${placa}` : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-brand-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
        </header>

        {isSubmitted ? (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Documentos e Vistoria Enviados!</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              Seus documentos foram recebidos e salvos no sistema. Nossa equipe já está revisando as
              fotos para aprovação e liberação imediata da sua proteção.
            </p>
            <div className="pt-4">
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition"
              >
                Voltar à Página Inicial
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bloco 1: Documentos Obrigatórios */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">Documentação do Cadastro</h2>
                  <p className="text-[11px] text-slate-400">Documento pessoal, do carro e residência</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* CNH ou RG */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3.5 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[130px]">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setCnhOuRg(e.target.files?.[0] || null)}
                  />
                  {cnhOuRg ? (
                    <div className="text-emerald-400 text-xs font-bold flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="truncate max-w-[120px]">{cnhOuRg.name}</span>
                    </div>
                  ) : (
                    <>
                      <UserCheck className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">CNH ou RG *</span>
                      <span className="text-[10px] text-slate-500">frente e verso</span>
                    </>
                  )}
                </label>

                {/* CRLV */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3.5 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[130px]">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setCrlv(e.target.files?.[0] || null)}
                  />
                  {crlv ? (
                    <div className="text-emerald-400 text-xs font-bold flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="truncate max-w-[120px]">{crlv.name}</span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Doc. do Carro (CRLV) *</span>
                      <span className="text-[10px] text-slate-500">digital ou impresso</span>
                    </>
                  )}
                </label>

                {/* Comprovante de Residência */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3.5 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[130px]">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setComprovanteResidencia(e.target.files?.[0] || null)}
                  />
                  {comprovanteResidencia ? (
                    <div className="text-emerald-400 text-xs font-bold flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="truncate max-w-[120px]">{comprovanteResidencia.name}</span>
                    </div>
                  ) : (
                    <>
                      <Home className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Comprovante Residência *</span>
                      <span className="text-[10px] text-slate-500">luz, água ou tel. recente</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Bloco 2: Fotos do Veículo */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">Fotos do Veículo</h2>
                  <p className="text-[11px] text-slate-400">Tire em local bem iluminado mostrando as placas</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {/* Frente */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFotoFrente(e.target.files?.[0] || null)}
                  />
                  {fotoFrente ? (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Frente OK
                    </span>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Frente</span>
                      <span className="text-[10px] text-slate-500">com placa</span>
                    </>
                  )}
                </label>

                {/* Traseira */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFotoTraseira(e.target.files?.[0] || null)}
                  />
                  {fotoTraseira ? (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Traseira OK
                    </span>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Traseira</span>
                      <span className="text-[10px] text-slate-500">com placa</span>
                    </>
                  )}
                </label>

                {/* Lateral Direita */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFotoLatDir(e.target.files?.[0] || null)}
                  />
                  {fotoLatDir ? (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Lat. Dir. OK
                    </span>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Lateral Dir.</span>
                      <span className="text-[10px] text-slate-500">inteira</span>
                    </>
                  )}
                </label>

                {/* Lateral Esquerda */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFotoLatEsq(e.target.files?.[0] || null)}
                  />
                  {fotoLatEsq ? (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Lat. Esq. OK
                    </span>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Lateral Esq.</span>
                      <span className="text-[10px] text-slate-500">inteira</span>
                    </>
                  )}
                </label>

                {/* Painel com KM */}
                <label className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-3 text-center cursor-pointer transition bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px] col-span-2 sm:col-span-1">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFotoPainel(e.target.files?.[0] || null)}
                  />
                  {fotoPainel ? (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Painel OK
                    </span>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Painel com KM</span>
                      <span className="text-[10px] text-slate-500">chave ligada</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 text-base active:scale-95"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enviar Documentos e Concluir Vistoria</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function VistoriaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VistoriaContent />
    </Suspense>
  )
}
