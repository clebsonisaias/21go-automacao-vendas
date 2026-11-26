'use client'

import React, { useState } from 'react'
import { ArrowRight } from 'lucide-react'

/**
 * Atalho da cotação nas páginas por cidade: guarda a placa só nesta aba (sessionStorage, nunca na
 * URL) e o estado, e abre a cotação da home, que busca sozinha.
 */
export function CotarPelaPlaca({ uf, cidade }: { uf: string; cidade?: string }) {
  const [placa, setPlaca] = useState('')
  const [erro, setErro] = useState('')

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const limpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (limpa.length !== 7) {
      setErro('Digite a placa completa, com 7 caracteres.')
      return
    }
    try {
      sessionStorage.setItem('21go-placa', limpa)
      if (uf) localStorage.setItem('21go-uf', uf)
    } catch {
      /* sem armazenamento: a home abre e a pessoa digita de novo */
    }
    window.location.href = '/#cotacao'
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
      <label htmlFor="cidade-placa" className="text-sm font-semibold text-navy-800">
        Placa do veículo{cidade ? ` (para quem mora em ${cidade})` : ''}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="cidade-placa"
          value={placa}
          onChange={(e) => {
            setPlaca(e.target.value.toUpperCase().slice(0, 8))
            if (erro) setErro('')
          }}
          onBlur={() => {
            if (placa && placa.replace(/[^A-Za-z0-9]/g, '').length !== 7) setErro('Digite a placa completa, com 7 caracteres.')
          }}
          placeholder="ABC1D23"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={!!erro}
          aria-describedby={erro ? 'cidade-placa-erro' : 'cidade-placa-ajuda'}
          className="min-h-[52px] w-full rounded-lg border border-[#c9d1e6] bg-white px-4 text-xl font-bold tracking-[3px] text-navy-800 placeholder:text-muted-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-600 sm:max-w-[260px]"
        />
        <button
          type="submit"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-go-orange px-6 text-base font-extrabold text-navy-950 transition hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600"
        >
          Ver o preço
          <ArrowRight aria-hidden className="h-5 w-5" />
        </button>
      </div>
      {erro ? (
        <p id="cidade-placa-erro" role="alert" className="m-0 text-sm font-semibold text-red-700">
          {erro}
        </p>
      ) : (
        <p id="cidade-placa-ajuda" className="m-0 text-sm text-muted">
          Grátis e sem compromisso. Os valores são os oficiais da 21Go para o seu veículo.
        </p>
      )}
    </form>
  )
}
