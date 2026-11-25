'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Home,
  Info,
  UserCheck,
  Sparkles,
  TicketPercent,
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
  { key: 'cnhOuRg', title: 'CNH ou RG', hint: 'PDF da CNH digital ou foto da frente e do verso', icon: UserCheck },
  { key: 'crlv', title: 'Documento do carro (CRLV)', hint: 'PDF do CRLV digital ou foto', icon: FileText },
  {
    key: 'comprovanteResidencia',
    title: 'Comprovante de residência',
    hint: 'Conta recente de luz, água ou telefone, em PDF ou foto',
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

const TOTAL = DOCUMENTOS.length

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

type Situacao = {
  documentos: boolean
  documentosEm?: string | null
  appVistoUrl: string | null
  vistoriaStatus?: string | null
  pagamentoUrl: string | null
  pago: boolean
  ativacao?: number
  ativacaoOriginal?: number | null
  cupom?: string | null
  podeAplicarCupom?: boolean
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/**
 * Cupom de desconto na adesão: o cliente pode aplicar aqui se não usou no cadastro,
 * até o Pix da adesão ser gerado. Fora do formulário dos documentos (Enter não envia os arquivos).
 */
function CupomAdesao({
  refId,
  situacao,
  onAplicado,
}: {
  refId: string
  situacao: Situacao | null
  onAplicado: (s: Partial<Situacao>) => void
}) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!situacao) return null
  if (situacao.cupom) {
    return (
      <section
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-line bg-white p-5 text-left shadow-card"
      >
        <TicketPercent aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
        <p className="m-0 text-sm text-navy-800">
          <strong>Cupom {situacao.cupom} aplicado.</strong>{' '}
          {typeof situacao.ativacao === 'number' && situacao.ativacao <= 0
            ? 'Sua adesão ficou grátis.'
            : `Adesão de ${brl(situacao.ativacaoOriginal ?? situacao.ativacao ?? 0)} por ${brl(situacao.ativacao ?? 0)}.`}
        </p>
      </section>
    )
  }
  if (!situacao.podeAplicarCupom) return null

  async function aplicar(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) {
      setErro('Digite o código do cupom.')
      return
    }
    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/vistoria/cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: refId, codigo }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.ok) {
        onAplicado({
          cupom: d.codigo,
          ativacao: d.ativacaoFinal,
          ativacaoOriginal: d.ativacaoOriginal,
          podeAplicarCupom: false,
        })
      } else {
        setErro(d?.erro || 'Não foi possível aplicar o cupom agora. Tente de novo.')
      }
    } catch {
      setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={aplicar}
      noValidate
      className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 text-left shadow-card sm:p-7"
    >
      <div className="flex items-start gap-3">
        <TicketPercent aria-hidden className="mt-1 h-5 w-5 shrink-0 text-go-orange-dark" />
        <div>
          <h2 className="m-0 text-lg font-extrabold leading-snug">Tem cupom de desconto na adesão?</h2>
          <p className="m-0 mt-0.5 text-sm text-muted">Opcional. Dá para aplicar até o Pix da adesão ser gerado.</p>
        </div>
      </div>
      <label htmlFor="cupom-adesao" className="text-sm font-semibold text-navy-800">
        Código do cupom
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="cupom-adesao"
          name="cupom"
          autoComplete="off"
          autoCapitalize="characters"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.toUpperCase())
            if (erro) setErro('')
          }}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? 'cupom-adesao-erro' : undefined}
          className="min-h-[48px] flex-1 rounded-lg border border-line bg-white px-4 text-base uppercase tracking-wide aria-[invalid=true]:border-red-700 text-navy-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-orange"
        />
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-navy-800 px-5 font-bold text-navy-800 transition hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          Aplicar cupom
        </button>
      </div>
      {erro && (
        <p id="cupom-adesao-erro" role="alert" className="m-0 text-sm font-semibold text-red-700">
          {erro}
        </p>
      )}
    </form>
  )
}

// Etapas da vistoria no CRM 21Go, em palavras do cliente.
const ETAPA_VISTORIA: Record<string, string> = {
  criada: 'Aguardando as suas fotos.',
  em_andamento: 'Recebendo as suas fotos.',
  aguardando_revisao: 'Fotos recebidas. A 21Go está analisando a vistoria.',
  aprovada: 'Vistoria aprovada!',
}

/** Próximos passos depois dos documentos: atualiza sozinho quando a equipe envia o link ou libera o Pix. */
function ProximosPassos({ situacao }: { situacao: Situacao | null }) {
  if (situacao?.pago) {
    return (
      <p className="m-0 max-w-md text-base leading-relaxed text-muted">
        Adesão paga. Seu cadastro está completo. A 21Go envia os seus dados de acesso por e-mail e WhatsApp.
      </p>
    )
  }
  if (situacao?.pagamentoUrl) {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        <p className="m-0 text-base leading-relaxed text-muted">
          Vistoria aprovada! Falta só o último passo: a taxa de adesão por Pix.
        </p>
        <a
          href={situacao.pagamentoUrl}
          className="flex min-h-[52px] items-center justify-center rounded-xl bg-emerald-700 px-6 text-base font-extrabold text-white no-underline transition hover:bg-emerald-800"
        >
          Pagar a adesão via Pix
        </a>
      </div>
    )
  }
  if (situacao?.appVistoUrl) {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        <p className="m-0 text-base leading-relaxed text-muted">
          Sua vistoria está liberada. Faça as fotos do veículo no App Visto, a vistoria oficial da 21Go. O mesmo link
          foi para o seu WhatsApp.
        </p>
        <a
          href={situacao.appVistoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] items-center justify-center rounded-xl bg-navy-900 px-6 text-base font-extrabold text-white no-underline transition hover:bg-navy-800"
        >
          Fazer a vistoria no App Visto
        </a>
        {situacao.vistoriaStatus && ETAPA_VISTORIA[situacao.vistoriaStatus] && (
          <p aria-live="polite" className="m-0 text-sm font-semibold text-navy-800">
            {ETAPA_VISTORIA[situacao.vistoriaStatus]}
          </p>
        )}
        <p className="m-0 text-sm leading-relaxed text-muted">
          Depois das fotos, a equipe da 21Go analisa a vistoria, o que pode levar um tempo. Não precisa ficar nesta
          tela: quando aprovar, enviamos pelo e-mail e pelo WhatsApp cadastrados o link do Pix da adesão. Os dados de
          acesso a própria 21Go envia.
        </p>
      </div>
    )
  }
  return <AguardandoLink desde={situacao?.documentosEm} />
}

// Tempo normal para o link sair: o PowerCRM leva uns 4 minutos para passar o cadastro ao CRM da 21Go.
const ESPERA_LINK_MS = 4 * 60_000

/** Espera do link com contagem regressiva de 4 minutos a partir do envio dos documentos. */
function AguardandoLink({ desde }: { desde?: string | null }) {
  const inicio = desde ? new Date(desde).getTime() : null
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const restante = inicio ? Math.max(0, inicio + ESPERA_LINK_MS - agora) : ESPERA_LINK_MS
  const passou = Boolean(inicio) && restante === 0
  const seg = Math.ceil(restante / 1000)
  const relogio = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
  const progresso = inicio ? Math.min(100, ((ESPERA_LINK_MS - restante) / ESPERA_LINK_MS) * 100) : 0
  // Leitor de tela: só o minuto, para não anunciar a cada segundo.
  const minutos = Math.max(1, Math.ceil(seg / 60))

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <p className="m-0 text-base leading-relaxed text-muted">
        Recebemos seus documentos e estamos gerando o link da vistoria oficial da 21Go.{' '}
        <strong className="text-navy-800">É normal levar uns 4 minutos.</strong> O link aparece aqui sozinho e também
        chega no seu WhatsApp e e-mail.
      </p>

      {passou ? (
        <p aria-live="polite" className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
          Está levando um pouco mais que o normal. Pode aguardar aqui ou fechar: avisamos no WhatsApp e e-mail.
        </p>
      ) : (
        <div className="flex w-full flex-col items-center gap-2">
          <span aria-hidden className="font-mono text-4xl font-extrabold tabular-nums text-navy-950">
            {relogio}
          </span>
          <div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
            <div className="h-full rounded-full bg-go-lime" style={{ width: `${progresso}%` }} />
          </div>
          <p aria-live="polite" className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            <span className="sr-only">Faltam cerca de {minutos} {minutos === 1 ? 'minuto' : 'minutos'}. </span>
            Gerando o link da vistoria…
          </p>
        </div>
      )}
    </div>
  )
}

function VistoriaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') || ''

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
  const [progress, setProgress] = useState('')
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [situacao, setSituacao] = useState<Situacao | null>(null)

  useEffect(() => {
    if (!ref) return
    let stop = false
    const check = async () => {
      try {
        const res = await fetch(`/api/vistoria/situacao?ref=${encodeURIComponent(ref)}`, { cache: 'no-store' })
        if (!res.ok) return
        const data: Situacao = await res.json()
        if (stop) return
        setSituacao(data)
        if (data.documentos) setIsSubmitted(true)
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }
    check()
    const t = setInterval(check, 8000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [ref])

  const handleDocExtracted = async (result: DocumentAiResult) => {
    if (result.model === 'simulation' || !result.success) {
      setAiSummary('Documento anexado! Nossa equipe fará a conferência pela imagem.')
      return
    }

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

    // Envia os dados extraídos para completar o cadastro automaticamente
    if (ref) {
      try {
        await fetch('/api/vistoria/extrair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref, extracted: result }),
        })
      } catch {
        // falha silenciosa: os dados ainda são úteis na tela
      }
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

    try {
      const entries = (Object.entries(files) as [SlotKey, File | null][]).filter(([, f]) => f)
      let done = 0
      for (const [slot, file] of entries) {
        setProgress(`Enviando arquivo ${done + 1} de ${entries.length}…`)
        const fd = new FormData()
        fd.append('ref', ref)
        fd.append('slot', slot)
        fd.append('file', file as File)
        const up = await fetch('/api/vistoria/upload', { method: 'POST', body: fd })
        if (!up.ok) {
          const data = await up.json().catch(() => ({}))
          const titulo = [...DOCUMENTOS, ...FOTOS].find((x) => x.key === slot)?.title || 'arquivo'
          setError(`${titulo}: ${data?.error || 'não foi possível enviar. Tente de novo.'}`)
          return
        }
        done++
      }

      setProgress('Concluindo…')
      const res = await fetch('/api/vistoria/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setIsSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Não foi possível enviar agora. Tente novamente em instantes.')
      }
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
    } finally {
      setIsSubmitting(false)
      setProgress('')
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-navy-line bg-navy-950">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
          <Logo size={48} href="/" />
          <span className="hidden text-sm font-semibold text-white sm:block">Documentos</span>
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
              Documentos enviados!
            </h1>
            <ProximosPassos situacao={situacao} />
            <div className="w-full max-w-md">
              <CupomAdesao
                refId={ref}
                situacao={situacao}
                onAplicado={(s) => setSituacao((atual) => (atual ? { ...atual, ...s } : atual))}
              />
            </div>
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
                Envie os seus documentos
              </h1>
              <p className="m-0 text-base text-muted">
                CNH ou RG, documento do carro (CRLV) e comprovante de residência. A IA preenche os dados automaticamente.
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

            <CupomAdesao
              refId={ref}
              situacao={situacao}
              onAplicado={(s) => setSituacao((atual) => (atual ? { ...atual, ...s } : atual))}
            />

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-sm font-extrabold text-navy-700">
                    01
                  </span>
                  <div>
                    <h2 className="m-0 text-xl font-extrabold">Documentos</h2>
                    <p className="m-0 text-sm text-muted">
                      Envie de preferência em PDF. Se não tiver, mande uma foto nítida, sem reflexo. Nome, CPF, placa e
                      endereço são lidos automaticamente.
                    </p>
                  </div>
                </div>

                <p className="m-0 mb-4 flex items-start gap-2 rounded-lg bg-surface-50 px-3.5 py-3 text-sm leading-relaxed text-navy-800">
                  <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
                  <span>
                    <strong>Onde pegar o PDF:</strong> a CNH e o documento do carro saem em PDF no app Carteira Digital de
                    Trânsito; a conta de luz ou de água, no site ou app da empresa.
                  </span>
                </p>

                <div className="mb-4">
                  <DocumentAiUploader
                    label="Ler um documento agora (PDF ou foto)"
                    camera={false}
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

              <aside className="flex items-start gap-3 rounded-xl border border-go-orange bg-[#fef5e7] p-4 text-sm leading-relaxed text-navy-800">
                <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
                <p className="m-0">
                  <strong>Os dados da CNH, CRLV e comprovante são lidos automaticamente.</strong> Você só precisa informar e-mail e WhatsApp se ainda não tiver feito. As fotos do veículo são feitas no App Visto.
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
                {isSubmitting ? progress || 'Enviando…' : 'Enviar documentos'}
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
