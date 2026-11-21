'use client'

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Copy, Loader2, QrCode } from 'lucide-react'
import { Logo } from '@/components/home/SiteChrome'

interface PixData {
  valor: number
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
}

type Phase = 'loading' | 'locked' | 'pending' | 'paid' | 'expired' | 'error'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function PagamentoContent() {
  const router = useRouter()
  const ref = useSearchParams().get('ref') || ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [pix, setPix] = useState<PixData | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const redirected = useRef(false)

  // Pago: mostra a conclusão. Se ainda faltar a vistoria (cadastro antigo), leva até ela.
  const goVistoria = useCallback(
    (url?: string) => {
      if (redirected.current) return
      redirected.current = true
      setPhase('paid')
      if (url) setTimeout(() => router.push(url), 1800)
    },
    [router]
  )

  // Gera (ou recupera) o Pix. O valor é definido pelo servidor; aqui só enviamos a ref.
  const createPix = useCallback(async () => {
    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/pagamento/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Não foi possível gerar o Pix agora.')
        setPhase('error')
        return
      }
      if (data.status === 'paid') {
        goVistoria(data.vistoriaUrl)
        return
      }
      if (data.status === 'bloqueado') {
        // A adesão é o último passo: só abre depois da vistoria aprovada pela equipe.
        setPhase('locked')
        return
      }
      setPix(data)
      setPhase('pending')
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
      setPhase('error')
    }
  }, [ref, goVistoria])

  useEffect(() => {
    if (!ref) {
      setError('Link de pagamento inválido.')
      setPhase('error')
      return
    }
    createPix()
  }, [ref, createPix])

  // Confere a confirmação a cada 4 s enquanto o Pix está pendente.
  useEffect(() => {
    if (phase !== 'pending') return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamento/status?ref=${encodeURIComponent(ref)}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.status === 'paid') goVistoria(data.vistoriaUrl)
        else if (data.status === 'expired') setPhase('expired')
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 4000)
    return () => clearInterval(t)
  }, [phase, ref, goVistoria])

  const copy = async () => {
    if (!pix?.qrCode) return
    try {
      await navigator.clipboard.writeText(pix.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Não consegui copiar automaticamente. Selecione o código e copie manualmente.')
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-navy-line bg-navy-950">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
          <Logo size={48} href="/" />
          <span className="hidden text-sm font-semibold text-white sm:block">Pagamento da adesão</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[560px] flex-col gap-6 px-5 pb-16 pt-10 sm:px-6">
        {phase === 'loading' && (
          <section aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-10 text-center shadow-card">
            <Loader2 aria-hidden className="h-8 w-8 animate-spin text-navy-800" />
            <p className="m-0 text-base text-muted">Gerando o seu Pix…</p>
          </section>
        )}

        {phase === 'pending' && pix && (
          <section className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-white p-6 text-center shadow-card sm:p-8">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-[-0.8px]">Último passo: pague a adesão via Pix</h1>
              <p className="m-0 text-base text-muted">
                Valor: <strong className="text-navy-800">{brl(pix.valor)}</strong>
              </p>
            </div>

            {pix.qrCodeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code do Pix para pagamento da taxa de adesão"
                width={224}
                height={224}
                className="h-56 w-56 rounded-xl border border-line bg-white p-2"
              />
            ) : (
              <QrCode aria-hidden className="h-16 w-16 text-muted" />
            )}

            {pix.qrCode && (
              <div className="flex w-full flex-col gap-2">
                <label htmlFor="pix-code" className="text-left text-sm font-bold text-navy-800">
                  Pix Copia e Cola
                </label>
                <textarea
                  id="pix-code"
                  readOnly
                  value={pix.qrCode}
                  rows={3}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full resize-none rounded-lg border border-line bg-surface-100 p-3 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-extrabold text-white transition hover:bg-emerald-700"
                >
                  <Copy aria-hidden className="h-4 w-4" />
                  {copied ? 'Código copiado!' : 'Copiar código Pix'}
                </button>
              </div>
            )}

            <p aria-live="polite" className="m-0 flex items-center gap-2 text-sm text-muted">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Aguardando a confirmação do pagamento…
            </p>
            <p className="m-0 text-xs text-muted">
              Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código. Esta página confirma sozinha
              quando o pagamento entrar, e também avisamos no seu WhatsApp.
            </p>
            {error && <p role="alert" className="m-0 text-sm font-semibold text-red-700">{error}</p>}
          </section>
        )}

        {phase === 'paid' && (
          <section aria-live="polite" className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-10 text-center shadow-card">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-go-lime">
              <CheckCircle2 aria-hidden className="h-9 w-9 text-navy-950" />
            </span>
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.8px]">Pagamento confirmado!</h1>
            <p className="m-0 max-w-sm text-base text-muted">
              Seu cadastro está completo. A 21Go envia os seus dados de acesso por e-mail e WhatsApp.
            </p>
            <a
              href="/"
              className="mt-2 inline-flex min-h-[48px] items-center rounded-lg border border-navy-800 px-6 font-bold text-navy-800 no-underline transition hover:bg-surface-100"
            >
              Voltar à página inicial
            </a>
          </section>
        )}

        {phase === 'locked' && (
          <section aria-live="polite" className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.6px]">A adesão é o último passo</h1>
            <p className="m-0 max-w-sm text-base text-muted">
              Primeiro vem a vistoria no App Visto, pelo link que enviamos no seu WhatsApp. Com a vistoria aprovada,
              enviamos o Pix da adesão por lá.
            </p>
            <a
              href="/"
              className="mt-2 inline-flex min-h-[48px] items-center rounded-lg border border-navy-800 px-6 font-bold text-navy-800 no-underline transition hover:bg-surface-100"
            >
              Voltar à página inicial
            </a>
          </section>
        )}

        {phase === 'expired' && (
          <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.6px]">Este Pix expirou</h1>
            <p className="m-0 text-base text-muted">Sem problema: gere um novo código para concluir a adesão.</p>
            <button
              type="button"
              onClick={createPix}
              className="flex min-h-[48px] items-center justify-center rounded-xl bg-navy-900 px-6 font-bold text-white transition hover:bg-navy-800"
            >
              Gerar novo Pix
            </button>
          </section>
        )}

        {phase === 'error' && (
          <section role="alert" className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.6px]">Não foi possível continuar</h1>
            <p className="m-0 text-base text-muted">{error}</p>
            {ref && (
              <button
                type="button"
                onClick={createPix}
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-navy-900 px-6 font-bold text-white transition hover:bg-navy-800"
              >
                Tentar novamente
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default function PagamentoPage() {
  return (
    <Suspense fallback={null}>
      <PagamentoContent />
    </Suspense>
  )
}
