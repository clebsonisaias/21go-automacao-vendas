'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, Pause, Play, Send } from 'lucide-react'

interface Snapshot {
  configured: boolean
  paused: boolean
  hour: number
  total: number
  next: { id: string; title: string; caption: string }
  posts: { date: string; title: string; status: 'publicado' | 'erro'; permalink?: string; error?: string; at: string }[]
}

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted'

export function InstagramPanel() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'' | 'publish' | 'toggle'>('')
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/social', { cache: 'no-store' })
      const d = await res.json()
      if (d.success) setData(d)
      else setError('Não foi possível carregar o Instagram.')
    } catch {
      setError('Sem conexão com o servidor.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (action: 'pause' | 'resume' | 'publish') => {
    setBusy(action === 'publish' ? 'publish' : 'toggle')
    setMessage('')
    try {
      const res = await fetch('/api/admin/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.posts) setData(d)
      if (!res.ok) setMessage(d.error ? `Não publicado: ${d.error}` : 'Não foi possível concluir. Tente de novo.')
      else if (action === 'publish') setMessage('Post publicado no Instagram.')
    } catch {
      setMessage('Sem conexão. Tente de novo.')
    } finally {
      setBusy('')
      setConfirming(false)
    }
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-line bg-white p-6 text-sm text-navy-900">
        {error}{' '}
        <button type="button" onClick={load} className="font-semibold text-navy-600 underline-offset-2 hover:underline">
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-line bg-white p-6" aria-busy="true">
        <div className="h-4 w-48 animate-pulse rounded bg-surface-100" />
        <div className="mt-4 h-40 w-full animate-pulse rounded bg-surface-100" />
      </div>
    )
  }

  const estado = !data.configured ? 'Não conectado' : data.paused ? 'Pausado' : `Ativo: um post por dia às ${data.hour}h`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy-900">Instagram</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            Posts automáticos em @citmax.21go. {data.total} artes em rodízio, uma por dia.
          </p>
        </div>
        <p className="m-0 inline-flex items-center gap-2 text-sm text-navy-800">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${!data.configured ? 'bg-red-600' : data.paused ? 'bg-amber-500' : 'bg-emerald-600'}`}
          />
          {estado}
        </p>
      </div>

      {!data.configured && (
        <div className="rounded-xl border border-line bg-white p-5 text-sm text-navy-900">
          <p className="m-0 font-semibold">Falta conectar a conta</p>
          <p className="m-0 mt-1 text-muted">
            Defina IG_USER_ID e IG_ACCESS_TOKEN no Coolify (app 21go-cotacao) e faça o redeploy. Até lá nada é publicado.
          </p>
        </div>
      )}

      <section aria-label="Próximo post" className="grid gap-5 rounded-xl border border-line bg-white p-5 md:grid-cols-[280px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/social/arte/${data.next.id}`}
          alt={`Arte do próximo post: ${data.next.title}`}
          width={280}
          height={350}
          className="h-auto w-full max-w-[280px] rounded-lg border border-line"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">Próximo post</h2>
          <p className="m-0 text-base font-semibold text-navy-900">{data.next.title}</p>
          <p className="m-0 whitespace-pre-line text-sm text-navy-800">{data.next.caption}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={() => act('publish')}
                  disabled={busy !== ''}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-wait"
                >
                  {busy === 'publish' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
                  {busy === 'publish' ? 'Publicando…' : 'Confirmar publicação em @citmax.21go'}
                </button>
                <button type="button" className={btn} onClick={() => setConfirming(false)} disabled={busy !== ''}>
                  Cancelar
                </button>
              </>
            ) : (
              <button type="button" className={btn} onClick={() => setConfirming(true)} disabled={!data.configured || busy !== ''}>
                <Send aria-hidden className="h-4 w-4" />
                Publicar agora
              </button>
            )}
            <button
              type="button"
              className={btn}
              onClick={() => act(data.paused ? 'resume' : 'pause')}
              disabled={busy !== ''}
            >
              {data.paused ? <Play aria-hidden className="h-4 w-4" /> : <Pause aria-hidden className="h-4 w-4" />}
              {data.paused ? 'Retomar posts automáticos' : 'Pausar posts automáticos'}
            </button>
          </div>
          <p aria-live="polite" className="m-0 min-h-[20px] text-sm text-navy-800">
            {message}
          </p>
        </div>
      </section>

      <section aria-label="Histórico" className="rounded-xl border border-line bg-white">
        <h2 className="m-0 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Histórico
        </h2>
        {data.posts.length === 0 ? (
          <p className="m-0 px-4 py-8 text-center text-sm text-muted">Nenhum post publicado ainda.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {data.posts.map((p) => (
              <li key={p.at} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-navy-900">{p.title}</span>
                  <span className="block text-xs text-muted">
                    {new Date(p.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {p.status === 'erro' && p.error ? ` · ${p.error}` : ''}
                  </span>
                </span>
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-navy-800">
                    <span aria-hidden className={`h-2 w-2 rounded-full ${p.status === 'publicado' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    {p.status === 'publicado' ? 'Publicado' : 'Não publicado'}
                  </span>
                  {p.permalink && (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-navy-600 underline-offset-2 hover:underline"
                    >
                      Abrir
                      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
