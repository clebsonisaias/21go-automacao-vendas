'use client'

import React, { forwardRef, useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import type { PedidoCotacao } from '@/lib/cotacao-whatsapp'
import type { OrigemLead } from '@/lib/origem'

/**
 * "Receber esta cotação no WhatsApp" (logo depois dos planos): quem ainda não quer se cadastrar
 * deixa só o WhatsApp. Ver src/lib/cotacao-whatsapp.ts e /api/quote/whatsapp.
 */

const inputCls =
  'min-h-[48px] w-full rounded-lg border border-[#c9d1e6] bg-white px-3.5 text-base text-navy-800 placeholder:text-muted-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-600'

function mascara(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length > 7) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  return n
}

const celularOk = (v: string) => {
  const n = v.replace(/\D/g, '')
  return n.length === 11 && n[2] === '9'
}

interface Props {
  quoteToken: string
  planoId: string
  planoNome: string
  pedido: PedidoCotacao | null
  placa: string
  cupom: string
  origem: () => OrigemLead | undefined
  /** Quem fechou o cadastro sem terminar: o título convida a decidir depois. */
  decidirDepois: boolean
  onEnviado: (whatsapp: string) => void
}

export const ReceberCotacaoWhatsApp = forwardRef<HTMLElement, Props>(function ReceberCotacaoWhatsApp(
  { quoteToken, planoId, planoNome, pedido, placa, cupom, origem, decidirDepois, onEnviado },
  ref
) {
  const [whatsapp, setWhatsapp] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [final, setFinal] = useState('')
  const [linkWhats, setLinkWhats] = useState('')
  const [isca, setIsca] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!celularOk(whatsapp)) {
      setErro('Digite o celular com DDD, como (84) 99999-8888.')
      return
    }
    if (!pedido) {
      setErro('Busque o veículo de novo para receber a cotação.')
      return
    }
    setErro('')
    setLinkWhats('')
    setEnviando(true)
    try {
      const res = await fetch('/api/quote/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, quoteToken, planoId, pedido, placa, cupom, origem: origem(), site: isca }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setFinal(d.final || whatsapp.replace(/\D/g, '').slice(-4))
        onEnviado(whatsapp)
      } else {
        setErro(d.error || 'Não foi possível enviar agora. Tente de novo.')
        if (d.whatsappCitmax) setLinkWhats(d.whatsappCitmax)
      }
    } catch {
      setErro('Sem conexão. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section
      ref={ref}
      aria-labelledby="receber-cotacao-titulo"
      className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100">
          <MessageCircle aria-hidden className="h-6 w-6 text-navy-600" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id="receber-cotacao-titulo" className="m-0 text-xl font-extrabold">
            {decidirDepois ? 'Prefere decidir depois? Receba esta cotação no WhatsApp' : 'Receber esta cotação no WhatsApp'}
          </h3>
          <p className="m-0 text-[15px] text-muted">
            Mandamos o plano {planoNome}, com os valores desta cotação, e o link para voltar a ela quando quiser.
          </p>
        </div>
      </div>

      <div aria-live="polite">
        {final && (
          <p className="m-0 rounded-lg border border-go-lime-dark/40 bg-surface-50 px-4 py-3 text-[15px] font-semibold text-navy-900">
            Pronto. A cotação foi para o WhatsApp com final {final}.
          </p>
        )}
      </div>

      {!final && (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-2">
          <label htmlFor="receber-cotacao-whatsapp" className="text-sm font-semibold">
            Seu WhatsApp com DDD
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="receber-cotacao-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(84) 99999-8888"
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(mascara(e.target.value))
                if (erro) setErro('')
              }}
              onBlur={() => {
                if (whatsapp && !celularOk(whatsapp)) setErro('Digite o celular com DDD, como (84) 99999-8888.')
              }}
              aria-invalid={!!erro}
              aria-describedby={erro ? 'receber-cotacao-erro receber-cotacao-consentimento' : 'receber-cotacao-consentimento'}
              className={`${inputCls} sm:max-w-[280px]`}
            />
            {/* Campo escondido: só robô preenche. */}
            <input
              type="text"
              name="site"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={isca}
              onChange={(e) => setIsca(e.target.value)}
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-navy-800 px-5 text-base font-extrabold text-white transition hover:bg-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {enviando ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <MessageCircle aria-hidden className="h-5 w-5" />}
              Receber no WhatsApp
            </button>
          </div>
          {erro && (
            <p id="receber-cotacao-erro" role="alert" className="m-0 text-sm font-semibold text-red-700">
              {erro}{' '}
              {linkWhats && (
                <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="underline">
                  Abrir o WhatsApp da CITmax
                </a>
              )}
            </p>
          )}
          <p id="receber-cotacao-consentimento" className="m-0 text-sm text-muted">
            Ao tocar em Receber no WhatsApp, você aceita receber esta cotação, até 2 lembretes e o contato da equipe da
            CITmax, consultor autorizado da 21Go, sobre ela.{' '}
            <a href="/privacidade" className="text-navy-600 underline">
              Privacidade
            </a>
          </p>
        </form>
      )}
    </section>
  )
})
