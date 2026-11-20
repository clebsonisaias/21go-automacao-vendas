'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import type { PlanPricing, QuoteCalculationResult } from '@/lib/types'
import { formatBRL } from '@/lib/format'

function formatPhone(val: string): string {
  const n = val.replace(/\D/g, '').slice(0, 11)
  if (n.length > 7) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  return n
}

export function LeadDialog({
  plan,
  quote,
  plate,
  price,
  comAdesivo,
  whatsappUrl,
  onClose,
}: {
  plan: PlanPricing
  quote: QuoteCalculationResult
  plate: string
  price: number
  comAdesivo: boolean
  whatsappUrl: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)
  const [doneUrl, setDoneUrl] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const validatePhone = () => {
    const ok = whatsapp.replace(/\D/g, '').length >= 10
    setPhoneError(ok ? '' : 'Digite o WhatsApp com DDD, por exemplo (21) 99999-9999.')
    return ok
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePhone()) return

    setSending(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/quote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          whatsapp,
          email,
          placa: plate || quote.vehicle.placa,
          planoEscolhidoId: plan.id,
          planoEscolhidoNome: plan.name,
          mensalidadeOriginal: plan.monthly,
          mensalidadeFinal: price,
          ativacao: plan.ativacao,
          comAdesivo,
          vehicle: quote.vehicle,
          powercrmMeta: quote.powercrmMeta,
        }),
      })
      const data = await res.json()
      if (data.success && data.whatsappUrl) {
        setDoneUrl(data.whatsappUrl)
        setTimeout(() => {
          window.location.href = data.whatsappUrl
        }, 1200)
      } else {
        setSubmitError('Não conseguimos registrar seus dados agora. Tente de novo ou chame um consultor no WhatsApp.')
      }
    } catch {
      setSubmitError('Sem conexão com o servidor. Tente de novo ou chame um consultor no WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="lead-titulo"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border-[3px] border-tinta bg-white p-0 text-tinta shadow-[8px_8px_0_#0E1A3B] backdrop:bg-tinta/70"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-md p-2 hover:bg-concreto"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {doneUrl ? (
          <div role="status" className="py-6">
            <h2 id="lead-titulo" className="font-display text-3xl font-bold">
              Dados enviados
            </h2>
            <p className="mt-3 text-lg">Abrindo o WhatsApp do consultor com a sua proposta.</p>
            <a href={doneUrl} className="btn mt-6 w-full bg-verde text-white hover:bg-verde-dark">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Abrir o WhatsApp agora
            </a>
          </div>
        ) : (
          <>
            <h2 id="lead-titulo" className="pr-10 font-display text-3xl font-bold leading-none">
              Contratar plano {plan.name}
            </h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-concreto p-4 text-[0.95rem]">
              <dt className="text-tinta/75">Veículo</dt>
              <dd className="font-semibold">
                {quote.vehicle.marca} {quote.vehicle.modelo}, {quote.vehicle.ano}
              </dd>
              <dt className="text-tinta/75">Mensalidade</dt>
              <dd className="font-semibold">{formatBRL(price)} por mês</dd>
              <dt className="text-tinta/75">Ativação</dt>
              <dd className="font-semibold">{formatBRL(plan.ativacao)} no Pix</dd>
            </dl>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="lead-nome" className="mb-1.5 block text-sm font-semibold">
                  Nome completo
                </label>
                <input
                  id="lead-nome"
                  className="campo"
                  type="text"
                  autoComplete="name"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="lead-whatsapp" className="mb-1.5 block text-sm font-semibold">
                  WhatsApp com DDD
                </label>
                <input
                  id="lead-whatsapp"
                  className="campo"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  required
                  placeholder="(21) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => {
                    setWhatsapp(formatPhone(e.target.value))
                    setPhoneError('')
                  }}
                  onBlur={() => whatsapp && validatePhone()}
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? 'lead-whatsapp-erro' : undefined}
                />
                {phoneError && (
                  <p id="lead-whatsapp-erro" className="mt-1.5 text-sm font-medium text-erro">
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lead-email" className="mb-1.5 block text-sm font-semibold">
                  E-mail <span className="font-normal text-tinta/75">(opcional)</span>
                </label>
                <input
                  id="lead-email"
                  className="campo"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {submitError && (
                <div role="alert" className="rounded-md border-l-4 border-erro bg-concreto px-4 py-3 text-[0.95rem] font-medium">
                  {submitError}{' '}
                  <a href={whatsappUrl} className="font-bold underline underline-offset-2">
                    Chamar no WhatsApp
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="btn w-full bg-verde text-white hover:bg-verde-dark"
              >
                {sending ? (
                  'Enviando'
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    Enviar e abrir o WhatsApp
                  </>
                )}
              </button>
              <p className="text-sm text-tinta/75">
                Seu orçamento é registrado no sistema da 21Go e um consultor continua o atendimento pelo WhatsApp.
              </p>
            </form>
          </>
        )}
      </div>
    </dialog>
  )
}
