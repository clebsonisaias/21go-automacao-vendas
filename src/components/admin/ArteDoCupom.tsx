'use client'

import React, { useEffect, useState } from 'react'
import { Download, Loader2, Sparkles } from 'lucide-react'
import { problemasDaArte, textosPadraoDoCupom, type FundoCupom, type TextosDaArte } from '@/lib/cupom-arte'
import type { CupomParaCompartilhar } from '@/lib/cupom-compartilhar'
import { problemasDoTexto } from '@/lib/arte-regras'

// Arte do cupom no modelo do manual (feed e story), dentro da caixa Compartilhar da aba Cupons.
// A IA pode escrever o título e o subtítulo; a prévia se atualiza sozinha e o PNG é baixado.

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:text-muted'
const campo =
  'min-h-[44px] w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600'
const rotulo = 'text-sm font-semibold text-navy-800'

const FUNDOS: { id: FundoCupom; nome: string }[] = [
  { id: 'marinho', nome: 'Marinho' },
  { id: 'laranja', nome: 'Laranja' },
  { id: 'claro', nome: 'Claro' },
]

export function ArteDoCupom({ cupomId, cupom, paraQuem }: { cupomId: string; cupom: CupomParaCompartilhar; paraQuem: string }) {
  const [textos, setTextos] = useState<TextosDaArte>(() => textosPadraoDoCupom(cupom, paraQuem))
  const [mexeu, setMexeu] = useState(false)
  const [fundo, setFundo] = useState<FundoCupom>('marinho')
  const [previa, setPrevia] = useState<{ textos: TextosDaArte; fundo: FundoCupom }>({ textos, fundo })
  const [escrevendo, setEscrevendo] = useState(false)
  const [aviso, setAviso] = useState('')

  // Enquanto ninguém mexeu nos textos, eles acompanham o "Para quem" da mensagem.
  useEffect(() => {
    if (!mexeu) setTextos(textosPadraoDoCupom(cupom, paraQuem))
  }, [cupom, paraQuem, mexeu])

  const problemas = problemasDaArte(cupom.codigo, textos, problemasDoTexto)

  // A prévia só pede a arte nova 600 ms depois da última mudança, e só se a arte estiver certa.
  useEffect(() => {
    if (problemas.length) return
    const t = setTimeout(() => setPrevia({ textos, fundo }), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textos.titulo, textos.destaque, textos.subtitulo, fundo, problemas.length])

  const url = (formato: 'feed' | 'story', baixar = false) => {
    const q = new URLSearchParams({
      titulo: previa.textos.titulo,
      destaque: previa.textos.destaque || '',
      subtitulo: previa.textos.subtitulo,
      fundo: previa.fundo,
      formato,
      ...(baixar ? { baixar: '1' } : {}),
    })
    return `/api/admin/cupons/${encodeURIComponent(cupomId)}/arte?${q}`
  }

  function mudar(campo: keyof TextosDaArte, valor: string) {
    setTextos((t) => ({ ...t, [campo]: valor }))
    setMexeu(true)
    setAviso('')
  }

  async function escreverComIa() {
    setEscrevendo(true)
    setAviso('')
    try {
      const res = await fetch(`/api/admin/cupons/${encodeURIComponent(cupomId)}/arte-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paraQuem }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success && d.textos) {
        setTextos(d.textos)
        setMexeu(true)
        setAviso(d.aviso || 'Textos escritos pela IA. Confira a prévia antes de baixar.')
      } else setAviso(d.error || 'A IA não respondeu. Tente de novo.')
    } catch {
      setAviso('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setEscrevendo(false)
    }
  }

  // Só baixa a arte que está na prévia (o que está nos campos, depois da espera de 600 ms).
  const pronta =
    !problemas.length &&
    previa.fundo === fundo &&
    previa.textos.titulo === textos.titulo &&
    (previa.textos.destaque || '') === (textos.destaque || '') &&
    previa.textos.subtitulo === textos.subtitulo

  return (
    <section aria-labelledby="arte-cupom-titulo" className="flex flex-col gap-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="arte-cupom-titulo" className="m-0 text-base font-semibold text-navy-900">
            Arte para mandar junto
          </h3>
          <p className="m-0 mt-1 text-xs text-muted">No modelo do manual. Sem preço nem porcentagem: o valor vai na mensagem.</p>
        </div>
        <button type="button" onClick={escreverComIa} disabled={escrevendo} className={btn}>
          {escrevendo ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden className="h-4 w-4" />}
          {escrevendo ? 'Escrevendo…' : 'Escrever com a IA'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="arte-cupom-titulo-campo" className={rotulo}>
              Título (até 8 palavras)
            </label>
            <input id="arte-cupom-titulo-campo" value={textos.titulo} onChange={(e) => mudar('titulo', e.target.value)} maxLength={80} className={campo} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="arte-cupom-destaque" className={rotulo}>
              Palavras em laranja (copiadas do título)
            </label>
            <input id="arte-cupom-destaque" value={textos.destaque || ''} onChange={(e) => mudar('destaque', e.target.value)} maxLength={40} className={campo} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="arte-cupom-subtitulo" className={rotulo}>
              Subtítulo (até 110 caracteres)
            </label>
            <input id="arte-cupom-subtitulo" value={textos.subtitulo} onChange={(e) => mudar('subtitulo', e.target.value)} maxLength={110} className={campo} />
          </div>
          <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
            <legend className={`${rotulo} mb-1.5`}>Fundo</legend>
            {FUNDOS.map((f) => (
              <label key={f.id} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-navy-900">
                <input type="radio" name="arte-cupom-fundo" value={f.id} checked={fundo === f.id} onChange={() => setFundo(f.id)} className="h-4 w-4" />
                {f.nome}
              </label>
            ))}
          </fieldset>
          {problemas.length > 0 && (
            <ul role="alert" className="m-0 list-disc pl-5 text-sm font-semibold text-red-700">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <p aria-live="polite" className="m-0 min-h-[20px] text-sm text-navy-800">
            {aviso}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {(['feed', 'story'] as const).map((f) => (
            <figure key={f} className="m-0 flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url(f)}
                alt={`Prévia da arte do cupom ${cupom.codigo} para o ${f === 'feed' ? 'feed' : 'story'}`}
                className={`rounded-lg border border-line bg-surface-100 ${f === 'feed' ? 'aspect-[4/5] w-[160px] sm:w-[200px]' : 'aspect-[9/16] w-[113px] sm:w-[141px]'}`}
              />
              <figcaption className="text-xs text-muted">{f === 'feed' ? 'Feed' : 'Story'}</figcaption>
              {pronta ? (
                <a href={url(f, true)} download={`cupom-${cupom.codigo}-${f}.png`} className={btn}>
                  <Download aria-hidden className="h-4 w-4" />
                  Baixar
                  <span className="sr-only">a arte do {f === 'feed' ? 'feed' : 'story'} em PNG</span>
                </a>
              ) : (
                <span className="inline-flex min-h-[44px] items-center text-xs text-muted">Atualizando…</span>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
