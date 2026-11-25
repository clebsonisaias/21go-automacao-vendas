'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
import { PENDENCIAS, type Pendencia } from '@/lib/pendencias'

// "O que a equipe precisa fazer" (topo da aba Carteira): os cadastros do site parados num passo da
// equipe, lidos do banco do site (funciona sem o CRM e sem o Telegram). Ver src/lib/pendencias.ts.

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:text-muted'

const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`)

export function PendenciasEquipe() {
  const [lista, setLista] = useState<Pendencia[] | null>(null)
  const [telegramLigado, setTelegramLigado] = useState(true)
  const [erro, setErro] = useState('')
  const [marcando, setMarcando] = useState('')
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const res = await fetch('/api/admin/pendencias', { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setLista(d.pendencias)
        setTelegramLigado(Boolean(d.telegramLigado))
      } else setErro(d.error || 'Não foi possível ler as pendências.')
    } catch {
      setErro('Sem conexão com o servidor.')
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function marcarSga(p: Pendencia) {
    setMarcando(p.ref)
    setAviso('')
    try {
      const res = await fetch('/api/admin/pendencias/sga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: p.ref }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setLista((l) => (l ? l.filter((x) => !(x.ref === p.ref && x.tipo === 'cadastrar_sga')) : l))
        setAviso(`${p.nome} marcado como cadastrado no SGA.`)
      } else setAviso(d.error || 'Não foi possível marcar. Tente de novo.')
    } catch {
      setAviso('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setMarcando('')
    }
  }

  return (
    <section aria-labelledby="pendencias-titulo" className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(26,39,84,0.05)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pendencias-titulo" className="m-0 text-base font-semibold text-navy-900">
          O que a equipe precisa fazer{lista && lista.length ? `: ${lista.length}` : ''}
        </h2>
        <p className="m-0 text-xs text-muted">Cadastros do site parados num passo da equipe.</p>
      </div>

      {!telegramLigado && (
        <p role="note" className="m-0 mt-3 rounded-lg border border-line bg-surface-50 p-3 text-sm text-navy-900">
          Os avisos do Telegram estão desligados (faltam TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no Coolify). Confira esta lista todo dia.
        </p>
      )}

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
          <span className="sr-only">Carregando as pendências…</span>
        </div>
      )}
      {lista && lista.length === 0 && <p className="m-0 mt-3 text-sm text-navy-900">Nada parado com a equipe agora.</p>}

      {lista && lista.length > 0 && (
        <div className="mt-4 flex flex-col gap-5">
          {PENDENCIAS.map((grupo) => {
            const itens = lista.filter((p) => p.tipo === grupo.tipo)
            if (!itens.length) return null
            return (
              <div key={grupo.tipo}>
                <h3 className="m-0 text-sm font-semibold text-navy-900">
                  {grupo.titulo} ({itens.length})
                </h3>
                <p className="m-0 mt-1 text-xs text-muted">{grupo.acao}</p>
                <ul className="m-0 mt-2 list-none divide-y divide-line rounded-lg border border-line p-0">
                  {itens.map((p) => (
                    <li key={`${p.tipo}-${p.ref}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy-900">{p.nome}</span>
                        <span className="block text-xs text-muted">
                          {[p.placa, quando(p.dias)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <a href={`/admin?cadastro=${encodeURIComponent(p.ref)}`} className={btn}>
                          <ExternalLink aria-hidden className="h-4 w-4" />
                          Abrir o cadastro
                          <span className="sr-only">de {p.nome}</span>
                        </a>
                        {p.tipo === 'cadastrar_sga' && (
                          <button type="button" onClick={() => marcarSga(p)} disabled={marcando === p.ref} className={btn}>
                            {marcando === p.ref ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />}
                            Já cadastrei no SGA
                            <span className="sr-only">: {p.nome}</span>
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
