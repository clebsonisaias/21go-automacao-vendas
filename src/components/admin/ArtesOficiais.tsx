'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, Send } from 'lucide-react'

// Artes oficiais da 21Go (Materiais do CRM) dentro da aba Instagram. A arte vem pronta: a equipe
// escolhe, confere, escreve a legenda e publica no clique (ver src/lib/crm-materiais.ts).

interface Arte {
  id: string
  nome: string
  titulo: string
  formato: 'feed' | 'story'
}

interface Pasta {
  id: string
  nome: string
  artes: Arte[]
}

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:text-muted'
const primario =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-wait'

export function ArtesOficiais({ configurado, aoPublicar }: { configurado: boolean; aoPublicar: () => void }) {
  const [pastas, setPastas] = useState<Pasta[] | null>(null)
  const [legendaPadrao, setLegendaPadrao] = useState('')
  const [erroCarga, setErroCarga] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const [pastaId, setPastaId] = useState('')
  const [arte, setArte] = useState<Arte | null>(null)
  const [formato, setFormato] = useState<'feed' | 'story'>('feed')
  const [legenda, setLegenda] = useState('')
  const [conferido, setConferido] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const gatilhoRef = useRef<HTMLButtonElement | null>(null)

  const carregar = useCallback(async (atualizar = false) => {
    setErroCarga('')
    if (atualizar) setAtualizando(true)
    try {
      const res = await fetch(`/api/admin/social/oficiais${atualizar ? '?atualizar=1' : ''}`, { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setPastas(d.pastas)
        setLegendaPadrao(d.legendaPadrao || '')
        setPastaId((atual) => (d.pastas.some((p: Pasta) => p.id === atual) ? atual : d.pastas[0]?.id || ''))
      } else setErroCarga(d.error || 'Não foi possível carregar as artes do CRM.')
    } catch {
      setErroCarga('Sem conexão com o servidor.')
    } finally {
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (arte) tituloRef.current?.focus()
  }, [arte])

  function escolher(a: Arte, e: React.MouseEvent<HTMLButtonElement>) {
    gatilhoRef.current = e.currentTarget
    setArte(a)
    setFormato(a.formato)
    setLegenda(legendaPadrao)
    setConferido(false)
    setConfirmando(false)
    setErro('')
    setAviso('')
  }

  function fechar() {
    setArte(null)
    setConfirmando(false)
    setErro('')
    requestAnimationFrame(() => gatilhoRef.current?.focus())
  }

  function pedirConfirmacao() {
    if (!conferido) {
      setErro('Confira a arte e marque a caixa antes de publicar.')
      return
    }
    // A legenda já vem com a chamada e as hashtags; falta a frase sobre a arte.
    const fraseNova = legenda
      .split('\n')
      .filter((l) => l.trim() && !legendaPadrao.includes(l.trim()))
      .join(' ')
      .trim()
    if (formato === 'feed' && fraseNova.length < 10) {
      setErro('Escreva a primeira linha da legenda, sobre o que a arte mostra.')
      document.getElementById('arte-oficial-legenda')?.focus()
      return
    }
    setErro('')
    setConfirmando(true)
  }

  async function publicar() {
    if (!arte) return
    setPublicando(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/social/oficiais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arteId: arte.id, formato, legenda, conferido }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setAviso(`"${arte.titulo}" publicada no ${formato === 'story' ? 'story' : 'feed'} de @citmax.21go.`)
        setArte(null)
        setConfirmando(false)
        aoPublicar()
        requestAnimationFrame(() => gatilhoRef.current?.focus())
      } else {
        setErro(d.error || 'Não foi possível publicar. Tente de novo.')
        setConfirmando(false)
      }
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo.')
      setConfirmando(false)
    } finally {
      setPublicando(false)
    }
  }

  const pasta = pastas?.find((p) => p.id === pastaId)

  return (
    <section aria-labelledby="artes-oficiais-titulo" className="rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 id="artes-oficiais-titulo" className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">
            Artes oficiais da 21Go
          </h2>
          <p className="m-0 mt-1 text-sm text-navy-800">
            Materiais do CRM. A arte vem pronta: confira se o que ela diz vale para os planos do site antes de publicar.
          </p>
        </div>
        <button type="button" onClick={() => carregar(true)} disabled={atualizando} className={btn}>
          <RefreshCw aria-hidden className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
          {atualizando ? 'Atualizando…' : 'Atualizar artes'}
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div aria-live="polite">{aviso && <p className="m-0 text-sm font-semibold text-navy-900">{aviso}</p>}</div>

        {erroCarga && !pastas && (
          <p role="alert" className="m-0 text-sm text-navy-900">
            {erroCarga}{' '}
            <button type="button" onClick={() => carregar()} className="inline-flex min-h-[44px] items-center font-semibold text-navy-600 underline-offset-2 hover:underline">
              Tentar de novo
            </button>
          </p>
        )}

        {!pastas && !erroCarga && (
          <div aria-busy="true" className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr))]">
            <span className="sr-only">Carregando as artes…</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-surface-100" />
            ))}
          </div>
        )}

        {pastas && pastas.length === 0 && <p className="m-0 text-sm text-navy-900">Os Materiais do CRM não têm artes em imagem.</p>}

        {pastas && pastas.length > 0 && (
          <>
            <div role="group" aria-label="Pastas dos Materiais" className="flex flex-wrap gap-2">
              {pastas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === pastaId}
                  onClick={() => {
                    setPastaId(p.id)
                    setArte(null)
                  }}
                  className={`${btn} ${p.id === pastaId ? 'border-navy-600 bg-surface-50' : ''}`}
                >
                  {p.nome}
                  <span className="font-normal tabular-nums text-muted">{p.artes.length}</span>
                </button>
              ))}
            </div>

            {arte && (
              <div className="grid gap-4 rounded-lg border border-line bg-surface-50 p-4 md:grid-cols-[260px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/social/oficiais/${arte.id}/previa?tam=1080`}
                  alt={`Prévia da arte oficial: ${arte.titulo}`}
                  className="h-auto w-full max-w-[260px] rounded-lg border border-line bg-white"
                />
                <div className="flex min-w-0 flex-col gap-3">
                  <h3 ref={tituloRef} tabIndex={-1} className="m-0 text-base font-semibold text-navy-900 outline-none">
                    {arte.titulo}
                  </h3>
                  <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
                    <legend className="mb-1.5 text-sm font-semibold text-navy-800">Onde publicar</legend>
                    {(['feed', 'story'] as const).map((f) => (
                      <label key={f} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-navy-900">
                        <input type="radio" name="arte-oficial-formato" value={f} checked={formato === f} onChange={() => setFormato(f)} className="h-4 w-4" />
                        {f === 'feed' ? 'Feed' : 'Story'}
                      </label>
                    ))}
                  </fieldset>
                  {formato === 'feed' ? (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="arte-oficial-legenda" className="text-sm font-semibold text-navy-800">
                        Legenda
                      </label>
                      <textarea
                        id="arte-oficial-legenda"
                        value={legenda}
                        onChange={(e) => {
                          setLegenda(e.target.value)
                          if (erro) setErro('')
                        }}
                        rows={7}
                        maxLength={2200}
                        aria-describedby="arte-oficial-legenda-ajuda"
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600"
                      />
                      <p id="arte-oficial-legenda-ajuda" className="m-0 text-xs text-muted">
                        Escreva a primeira linha. Sem preço, porcentagem, "seguro" ou marca de carro.
                      </p>
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-navy-800">O story sai só com a arte, sem legenda.</p>
                  )}
                  <label className="inline-flex min-h-[44px] items-start gap-2 text-sm text-navy-900">
                    <input
                      type="checkbox"
                      checked={conferido}
                      onChange={(e) => {
                        setConferido(e.target.checked)
                        if (erro) setErro('')
                      }}
                      className="mt-0.5 h-4 w-4"
                    />
                    Conferi a arte: o que ela diz vale para os planos do site.
                  </label>
                  {erro && (
                    <p role="alert" className="m-0 text-sm font-semibold text-red-700">
                      {erro}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {confirmando ? (
                      <>
                        <button type="button" onClick={publicar} disabled={publicando} className={primario}>
                          {publicando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
                          {publicando ? 'Publicando…' : `Confirmar publicação no ${formato === 'story' ? 'story' : 'feed'}`}
                        </button>
                        <button type="button" onClick={() => setConfirmando(false)} disabled={publicando} className={btn}>
                          Voltar
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={pedirConfirmacao} disabled={!configurado} className={primario}>
                          <Send aria-hidden className="h-4 w-4" />
                          {formato === 'story' ? 'Publicar no story' : 'Publicar no feed'}
                        </button>
                        <button type="button" onClick={fechar} className={btn}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                  {!configurado && <p className="m-0 text-xs text-muted">O Instagram não está conectado no site.</p>}
                </div>
              </div>
            )}

            {pasta && (
              <ul aria-label={`Artes da pasta ${pasta.nome}`} className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr))]">
                {pasta.artes.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={(e) => escolher(a, e)}
                      aria-pressed={arte?.id === a.id}
                      className={`flex w-full flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors hover:bg-surface-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 ${
                        arte?.id === a.id ? 'border-navy-600 bg-surface-50' : 'border-line bg-white'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/admin/social/oficiais/${a.id}/previa`} alt="" loading="lazy" className="aspect-square w-full rounded-md border border-line bg-surface-100 object-cover" />
                      <span className="text-sm font-semibold text-navy-900">{a.titulo}</span>
                      <span className="text-xs text-muted">{a.formato === 'story' ? 'Story' : 'Feed'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
