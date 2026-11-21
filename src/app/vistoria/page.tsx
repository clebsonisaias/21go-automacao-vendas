'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Home,
  Info,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/home/SiteChrome'
import { DocumentAiUploader } from '@/components/common/DocumentAiUploader'
import { DocumentAiResult } from '@/lib/types'

type SlotKey =
  | 'cnhOuRg'
  | 'crlv'
  | 'comprovanteResidencia'
  | 'fotoFrente'
  | 'fotoTraseira'
  | 'fotoLatDir'
  | 'fotoLatEsq'
  | 'fotoPainel'

interface Slot {
  key: SlotKey
  title: string
  hint: string
  icon: LucideIcon
}

const DOCUMENTOS: Slot[] = [
  { key: 'cnhOuRg', title: 'CNH ou RG', hint: 'Frente e verso', icon: UserCheck },
  { key: 'crlv', title: 'Documento do carro (CRLV)', hint: 'Digital ou impresso', icon: FileText },
  {
    key: 'comprovanteResidencia',
    title: 'Comprovante de residência',
    hint: 'Luz, água ou telefone recente',
    icon: Home,
  },
]

const FOTOS: Slot[] = [
  { key: 'fotoFrente', title: 'Frente', hint: 'Com a placa', icon: Camera },
  { key: 'fotoTraseira', title: 'Traseira', hint: 'Com a placa', icon: Camera },
  { key: 'fotoLatDir', title: 'Lateral direita', hint: 'Carro inteiro', icon: Camera },
  { key: 'fotoLatEsq', title: 'Lateral esquerda', hint: 'Carro inteiro', icon: Camera },
  { key: 'fotoPainel', title: 'Painel com KM', hint: 'Chave ligada', icon: Camera },
]

const TOTAL = DOCUMENTOS.length + FOTOS.length

function UploadSlot({
  slot,
  file,
  onChange,
  camera,
  invalid,
}: {
  slot: Slot
  file: File | null
  onChange: (f: File | null) => void
  camera?: boolean
  invalid?: boolean
}) {
  const Icon = slot.icon
  const border = file
    ? 'border-solid border-go-lime-dark bg-[#f6f9e1]'
    : invalid
      ? 'border-dashed border-red-600 bg-white'
      : 'border-dashed border-[#c9d1e6] bg-white hover:border-go-orange'

  return (
    <label
      className={`flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 text-center transition focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-go-orange ${border}`}
    >
      <input
        type="file"
        accept={camera ? 'image/*' : 'image/*,application/pdf'}
        {...(camera ? { capture: 'environment' as const } : {})}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          file ? 'bg-go-lime' : 'bg-surface-100'
        }`}
      >
        {file ? (
          <CheckCircle2 aria-hidden className="h-[18px] w-[18px] text-navy-950" />
        ) : (
          <Icon aria-hidden className="h-[18px] w-[18px] text-navy-700" />
        )}
      </span>
      <span className="text-[15px] font-bold leading-snug text-navy-800">{slot.title}</span>
      {file ? (
        <span className="max-w-full truncate text-xs font-semibold text-go-lime-dark">{file.name}</span>
      ) : (
        <span className="text-xs text-muted">{slot.hint}</span>
      )}
    </label>
  )
}

function VistoriaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') || ''

  // Com cobrança online, a vistoria só abre depois da adesão paga: se ainda não pagou, volta ao Pix.
  useEffect(() => {
    if (!ref) return
    fetch(`/api/pagamento/status?ref=${encodeURIComponent(ref)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.status === 'none' || d?.status === 'pending' || d?.status === 'expired') {
          router.replace(`/pagamento?ref=${encodeURIComponent(ref)}`)
        }
      })
      .catch(() => {})
  }, [ref, router])

  const nome = searchParams.get('nome') || 'Associado'
  const placa = searchParams.get('placa') || ''
  const veiculo = searchParams.get('veiculo') || 'Veículo'

  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    cnhOuRg: null,
    crlv: null,
    comprovanteResidencia: null,
    fotoFrente: null,
    fotoTraseira: null,
    fotoLatDir: null,
    fotoLatEsq: null,
    fotoPainel: null,
  })
  const [error, setError] = useState('')
  const [showMissing, setShowMissing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  const handleDocExtracted = (result: DocumentAiResult) => {
    if (result.documentType === 'crlv' && result.vehicle) {
      setAiSummary(
        `CRLV reconhecido! Veículo: ${result.vehicle.marcaModelo || 'Identificado'} · Placa: ${result.vehicle.placa || 'OK'}`
      )
    } else if (result.documentType === 'cnh' && result.personal) {
      setAiSummary(
        `CNH reconhecida! Titular: ${result.personal.nome} · CPF: ${result.personal.cpf || 'OK'}`
      )
    } else if (result.documentType === 'comprovante_residencia' && result.address) {
      setAiSummary(
        `Comprovante reconhecido! Endereço: ${result.address.cidade || ''}/${result.address.uf || ''}`
      )
    }
  }

  const setFile = (key: SlotKey) => (f: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: f }))
    setError('')
  }

  const enviados = Object.values(files).filter(Boolean).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!files.cnhOuRg || !files.crlv || !files.comprovanteResidencia) {
      setShowMissing(true)
      setError('Anexe a CNH (ou RG), o documento do veículo e o comprovante de residência.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const totalFotos = FOTOS.filter((s) => files[s.key]).length

    try {
      const res = await fetch('/api/vistoria/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref,
          nome,
          placa,
          veiculo,
          cnhOuRgNome: files.cnhOuRg.name,
          crlvNome: files.crlv.name,
          comprovanteResidenciaNome: files.comprovanteResidencia.name,
          totalFotos,
        }),
      })

      if (res.ok) {
        setIsSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Não foi possível enviar agora. Tente novamente em instantes.')
      }
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-navy-line bg-navy-950">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
          <Logo size={48} href="/" />
          <span className="hidden text-sm font-semibold text-white sm:block">Vistoria e documentos</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[820px] flex-col gap-6 px-5 pb-16 pt-10 sm:px-6">
        {isSubmitted ? (
          <section
            aria-live="polite"
            className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center shadow-card sm:p-12"
          >
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-go-lime">
              <CheckCircle2 aria-hidden className="h-9 w-9 text-navy-950" />
            </span>
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.8px]">
              Documentos e vistoria enviados!
            </h1>
            <p className="m-0 max-w-md text-base leading-relaxed text-muted">
              Recebemos seus documentos. Nossa equipe já está revisando as fotos para aprovar e liberar a sua
              proteção.
            </p>
            <a
              href="/"
              className="mt-2 inline-flex min-h-[48px] items-center rounded-lg border border-navy-800 px-6 font-bold text-navy-800 no-underline transition hover:bg-surface-100"
            >
              Voltar à página inicial
            </a>
          </section>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-[-1px] sm:text-4xl">
                Envie os documentos e as fotos do veículo
              </h1>
              <p className="m-0 text-base text-muted">
                Fotos nítidas, em local bem iluminado e mostrando as placas.
              </p>
            </div>

            <section
              aria-label="Resumo da vistoria"
              className="rounded-2xl bg-navy-950 p-6 text-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="m-0 text-sm text-muted-soft">Titular: {nome}</p>
                  <p className="m-0 mt-1 text-xl font-extrabold">
                    {veiculo}
                    {placa ? ` · ${placa}` : ''}
                  </p>
                </div>
                <p className="m-0 shrink-0 text-right font-bold" aria-live="polite">
                  <span className="text-go-orange">{enviados}</span> de {TOTAL} enviados
                </p>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={TOTAL}
                aria-valuenow={enviados}
                aria-label="Itens enviados"
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-navy-700"
              >
                <div
                  className="h-full rounded-full bg-go-orange transition-[width] duration-300"
                  style={{ width: `${(enviados / TOTAL) * 100}%` }}
                />
              </div>
            </section>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-sm font-extrabold text-navy-700">
                    01
                  </span>
                  <div>
                    <h2 className="m-0 text-xl font-extrabold">Documentos</h2>
                    <p className="m-0 text-sm text-muted">Envie fotos nítidas ou use o scanner de IA abaixo.</p>
                  </div>
                </div>

                <div className="mb-4">
                  <DocumentAiUploader
                    label="📷 Tirar foto da CNH ou CRLV (Leitura Automática com IA)"
                    onExtracted={handleDocExtracted}
                  />
                  {aiSummary && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-go-lime px-3.5 py-2 text-xs font-bold text-navy-950 animate-in fade-in">
                      <Sparkles className="h-4 w-4 shrink-0 text-navy-950" />
                      <span>{aiSummary}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  {DOCUMENTOS.map((slot) => (
                    <UploadSlot
                      key={slot.key}
                      slot={slot}
                      file={files[slot.key]}
                      onChange={setFile(slot.key)}
                      invalid={showMissing && !files[slot.key]}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-sm font-extrabold text-navy-700">
                    02
                  </span>
                  <div>
                    <h2 className="m-0 text-xl font-extrabold">Fotos do veículo</h2>
                    <p className="m-0 text-sm text-muted">Toque em cada quadro para abrir a câmera.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  {FOTOS.map((slot) => (
                    <UploadSlot
                      key={slot.key}
                      slot={slot}
                      file={files[slot.key]}
                      onChange={setFile(slot.key)}
                      camera
                    />
                  ))}
                </div>
              </section>

              <aside className="flex items-start gap-3 rounded-xl border border-go-orange bg-[#fef5e7] p-4 text-sm leading-relaxed text-navy-800">
                <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
                <p className="m-0">
                  <strong>Vistoria oficial 21Go (App Visto).</strong> A 21Go também disponibiliza o link oficial do
                  App Visto, com validação por câmera ao vivo e GPS, no seu WhatsApp. Se preferir adiantar os
                  documentos e fotos por este formulário, nossa equipe validará diretamente no CRM.
                </p>
              </aside>

              {error && (
                <p role="alert" className="m-0 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-lg bg-go-orange text-[17px] font-extrabold text-navy-950 transition hover:-translate-y-px hover:shadow-cta disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {isSubmitting ? 'Enviando…' : 'Enviar documentos e concluir vistoria'}
                {!isSubmitting && <ArrowRight aria-hidden className="h-5 w-5" />}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

export default function VistoriaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-50 text-muted">
          Carregando vistoria…
        </div>
      }
    >
      <VistoriaContent />
    </Suspense>
  )
}
