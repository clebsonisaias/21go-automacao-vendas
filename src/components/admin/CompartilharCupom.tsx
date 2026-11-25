'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Link2, MessageCircle, X } from 'lucide-react'
import { linkDoCupom, textoDoCupom, type CupomParaCompartilhar } from '@/lib/cupom-compartilhar'
import { SITE } from '@/lib/site'

// Caixa "Compartilhar" da aba Cupons: o texto sai pronto dos dados do cupom (o que dá, até quando
// vale, link que já preenche o cupom no cadastro). A equipe ajusta e manda pelo WhatsApp.

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600'
const primario =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600'
const campo =
  'w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600'

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export function CompartilharCupom({
  cupom,
  descricao,
  valendo,
  situacao,
  pixLigado,
  aoFechar,
}: {
  cupom: CupomParaCompartilhar
  descricao?: string
  valendo: boolean
  situacao: string
  pixLigado: boolean
  aoFechar: () => void
}) {
  const [paraQuem, setParaQuem] = useState(descricao || '')
  const [editado, setEditado] = useState(false)
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const textoRef = useRef<HTMLTextAreaElement>(null)

  const siteUrl = typeof window === 'undefined' ? 'https://21go.seg.br' : window.location.origin
  const sugerido = useMemo(
    () => textoDoCupom(cupom, { siteUrl, paraQuem, whatsapp: SITE.whatsapp }),
    [cupom, siteUrl, paraQuem]
  )
  const link = linkDoCupom(siteUrl, cupom.codigo)

  // Enquanto ninguém mexeu no texto, ele acompanha o "Para quem".
  useEffect(() => {
    if (!editado) setTexto(sugerido)
  }, [sugerido, editado])

  useEffect(() => {
    tituloRef.current?.focus()
  }, [cupom.codigo])

  async function copiarTexto() {
    if (await copiar(texto)) setAviso('Texto copiado. É só colar no WhatsApp.')
    else {
      textoRef.current?.select()
      setAviso('Não deu para copiar sozinho: o texto ficou selecionado, copie com o teclado.')
    }
  }

  async function copiarLink() {
    setAviso((await copiar(link)) ? 'Link copiado.' : `Não deu para copiar sozinho. O link é ${link}`)
  }

  return (
    <section aria-labelledby="compartilhar-titulo" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="compartilhar-titulo" ref={tituloRef} tabIndex={-1} className="m-0 text-base font-semibold text-navy-900 outline-none">
          Compartilhar o cupom {cupom.codigo}
        </h2>
        <button type="button" onClick={aoFechar} className={btn}>
          <X aria-hidden className="h-4 w-4" />
          Fechar
        </button>
      </div>

      {(!valendo || !pixLigado) && (
        <p role="note" className="m-0 rounded-lg border border-line bg-surface-50 p-3 text-sm text-navy-900">
          {!valendo
            ? `Este cupom não está valendo agora (${situacao.toLowerCase()}). Quem usar o link vai ver o aviso no cadastro.`
            : 'O Pix do site está desligado: quem tentar usar o cupom vai ver que ele está indisponível.'}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="compartilhar-para" className="text-sm font-semibold text-navy-800">
          Para quem (aparece no texto)
        </label>
        <input
          id="compartilhar-para"
          value={paraQuem}
          onChange={(e) => {
            setParaQuem(e.target.value)
            setEditado(false)
          }}
          maxLength={80}
          placeholder="Ex.: colaboradores da Netgo"
          className={`${campo} min-h-[44px]`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="compartilhar-texto" className="text-sm font-semibold text-navy-800">
          Texto
        </label>
        <textarea
          id="compartilhar-texto"
          ref={textoRef}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setEditado(true)
          }}
          rows={11}
          className={`${campo} py-2`}
        />
        <p className="m-0 text-xs text-muted">
          O link já preenche o cupom no cadastro.{editado ? ' Você editou o texto: mudar o "Para quem" não troca mais o texto.' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copiarTexto} className={primario}>
          <Copy aria-hidden className="h-4 w-4" />
          Copiar texto
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={btn}>
          <MessageCircle aria-hidden className="h-4 w-4" />
          Abrir no WhatsApp
          <span className="sr-only">(abre em outra aba)</span>
        </a>
        <button type="button" onClick={copiarLink} className={btn}>
          <Link2 aria-hidden className="h-4 w-4" />
          Copiar só o link
        </button>
      </div>
      <p aria-live="polite" className="m-0 min-h-[20px] text-sm text-navy-800">
        {aviso}
      </p>
    </section>
  )
}
