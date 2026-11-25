'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BellOff, Loader2, MessageCircle } from 'lucide-react'
import type { CotacaoParaEquipe } from '@/lib/cotacao-whatsapp'

// "Cotou e não fechou" (aba Carteira, abaixo de "O que a equipe precisa fazer"): quem pediu a
// cotação pelo WhatsApp na home e ainda não se cadastrou. Ver src/lib/cotacao-whatsapp.ts.

type Item = CotacaoParaEquipe & { sugestao: string }

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:text-muted'
const primario =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:opacity-70'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`)

const SITUACAO: Record<CotacaoParaEquipe['situacao'], string> = {
  aguardando: 'Recebeu a cotação',
  lembretes_enviados: 'Lembretes',
  respondeu: 'Conversou no chat',
  parada: 'Lembretes parados',
  nao_recebeu: 'Não recebeu (o WhatsApp recusou)',
}

function Linha({ c, aoMudar }: { c: Item; aoMudar: (msg: string) => void }) {
  const [aberto, setAberto] = useState<'mensagem' | 'parar' | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const caixaRef = useRef<HTMLTextAreaElement>(null)
  const idTexto = `cotacao-${c.id}`

  useEffect(() => {
    if (aberto === 'mensagem') caixaRef.current?.focus()
  }, [aberto])

  async function acao(corpo: Record<string, unknown>, ok: string) {
    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/cotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, ...corpo }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setAberto(null)
        aoMudar(ok)
      } else setErro(d.error || 'Não foi possível concluir. Tente de novo.')
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const detalhe = [
    c.situacao === 'lembretes_enviados' ? `${SITUACAO[c.situacao]} ${c.lembretes} de 2` : SITUACAO[c.situacao],
    c.abriuLink ? 'abriu o link' : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="flex flex-col gap-3 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-navy-900">{c.veiculo || 'Veículo'}</p>
          <p className="m-0 mt-0.5 text-xs text-muted">
            {[c.placa, `${c.plano} ${brl(c.mensalidade)}`, `WhatsApp •••• ${c.telefoneFinal}`, quando(c.dias)].filter(Boolean).join(' · ')}
          </p>
          <p className="m-0 mt-1 text-xs text-navy-800">{detalhe}</p>
        </div>
        {!aberto && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTexto(c.sugestao)
                setErro('')
                setAberto('mensagem')
              }}
              disabled={!c.podeMensagem}
              className={btn}
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              Preparar WhatsApp
              <span className="sr-only">para o final {c.telefoneFinal}</span>
            </button>
            {c.situacao !== 'parada' && c.situacao !== 'respondeu' && (
              <button type="button" onClick={() => setAberto('parar')} className={btn}>
                <BellOff aria-hidden className="h-4 w-4" />
                Parar lembretes
              </button>
            )}
          </div>
        )}
      </div>
      {!c.podeMensagem && !aberto && <p className="m-0 text-xs text-muted">Dá para mandar de novo 24 horas depois da última mensagem.</p>}

      {aberto === 'parar' && (
        <div role="group" aria-label="Confirmar parar lembretes" className="flex flex-col gap-2 rounded-lg border border-line bg-surface-50 p-3">
          <p className="m-0 text-sm text-navy-900">Parar os lembretes automáticos do WhatsApp final {c.telefoneFinal}? Não dá para desfazer.</p>
          {erro && (
            <p role="alert" className="m-0 text-xs font-semibold text-red-700">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={enviando} onClick={() => acao({ acao: 'parar' }, 'Lembretes parados.')} className={primario}>
              {enviando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <BellOff aria-hidden className="h-4 w-4" />}
              Parar lembretes
            </button>
            <button type="button" disabled={enviando} onClick={() => setAberto(null)} className={btn}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {aberto === 'mensagem' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (texto.trim().length < 10) {
              setErro('Escreva a mensagem antes de mandar.')
              caixaRef.current?.focus()
              return
            }
            acao({ acao: 'mensagem', texto }, 'Mensagem mandada. Os lembretes automáticos desta cotação pararam.')
          }}
          noValidate
          className="flex flex-col gap-2 rounded-lg border border-line bg-surface-50 p-3"
        >
          <label htmlFor={idTexto} className="text-sm font-semibold text-navy-800">
            Mensagem para o WhatsApp final {c.telefoneFinal}
          </label>
          <textarea
            id={idTexto}
            ref={caixaRef}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              if (erro) setErro('')
            }}
            onBlur={() => {
              if (texto.trim().length < 10) setErro('Escreva a mensagem antes de mandar.')
            }}
            rows={7}
            maxLength={1500}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `${idTexto}-erro` : `${idTexto}-ajuda`}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 aria-[invalid=true]:border-red-700"
          />
          {erro ? (
            <p id={`${idTexto}-erro`} role="alert" className="m-0 text-xs font-semibold text-red-700">
              {erro}
            </p>
          ) : (
            <p id={`${idTexto}-ajuda`} className="m-0 text-xs text-muted">
              Onde estiver [link da cotação], vai o link de verdade. Ao mandar, os lembretes automáticos desta cotação param.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={enviando} className={primario}>
              {enviando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <MessageCircle aria-hidden className="h-4 w-4" />}
              {enviando ? 'Mandando…' : 'Mandar pelo WhatsApp'}
            </button>
            <button type="button" onClick={() => setAberto(null)} disabled={enviando} className={btn}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </li>
  )
}

export function CotouNaoFechou() {
  const [lista, setLista] = useState<Item[] | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const res = await fetch('/api/admin/cotacoes', { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d.success) setLista(d.cotacoes)
      else setErro(d.error || 'Não foi possível ler as cotações.')
    } catch {
      setErro('Sem conexão com o servidor.')
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <section aria-labelledby="cotou-titulo" className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(26,39,84,0.05)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cotou-titulo" className="m-0 text-base font-semibold text-navy-900">
          Cotou e não fechou{lista && lista.length ? `: ${lista.length}` : ''}
        </h2>
        <p className="m-0 text-xs text-muted">Pediram a cotação no WhatsApp pelo site nos últimos 30 dias. Recebem até 2 lembretes sozinhos.</p>
      </div>

      <div aria-live="polite">{aviso && <p className="m-0 mt-3 text-sm text-navy-900">{aviso}</p>}</div>

      {erro && !lista && (
        <p role="alert" className="m-0 mt-3 text-sm text-navy-900">
          {erro}{' '}
          <button type="button" onClick={carregar} className="inline-flex min-h-[44px] items-center font-semibold text-navy-600 underline-offset-2 hover:underline">
            Tentar de novo
          </button>
        </p>
      )}
      {!lista && !erro && (
        <div aria-busy="true" className="mt-3 h-16 animate-pulse rounded-lg bg-surface-100">
          <span className="sr-only">Carregando as cotações…</span>
        </div>
      )}
      {lista && lista.length === 0 && (
        <p className="m-0 mt-3 text-sm text-navy-900">Ninguém pediu a cotação pelo WhatsApp sem fechar nos últimos 30 dias.</p>
      )}
      {lista && lista.length > 0 && (
        <ul className="m-0 mt-3 list-none divide-y divide-line rounded-lg border border-line p-0">
          {lista.map((c) => (
            <Linha
              key={c.id}
              c={c}
              aoMudar={(msg) => {
                setAviso(msg)
                carregar()
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
