'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { NOMES_CATEGORIA, type CategoriaNordeste, type FaixaNordeste } from '@/lib/tabela-nordeste'

// Aba "Tabela regional" do /admin (padrão Configuração): as faixas da tabela (só leitura) e a lista de
// modelos que usam a tabela de utilitário, que a equipe acrescenta e tira.
// A regra fica no servidor (src/lib/tabela-nordeste.ts, preco-regional.ts e regiao-comprovante.ts).

interface Dados {
  fonte: string
  tabelas: Record<CategoriaNordeste, FaixaNordeste[]>
  utilitarios: string[]
}

const CATEGORIAS: CategoriaNordeste[] = ['passeio', 'utilitario', 'moto', 'moto_especial']

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:text-muted'
const primario =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:bg-navy-600'
const campo =
  'min-h-[44px] w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 aria-[invalid=true]:border-red-700'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function TabelaNordestePanel() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erroCarga, setErroCarga] = useState('')
  const [categoria, setCategoria] = useState<CategoriaNordeste>('passeio')
  const [novo, setNovo] = useState('')
  const [erroNovo, setErroNovo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [tirando, setTirando] = useState('')
  const novoRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setErroCarga('')
    try {
      const res = await fetch('/api/admin/tabela-nordeste', { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d.success) setDados({ fonte: d.fonte, tabelas: d.tabelas, utilitarios: d.utilitarios })
      else setErroCarga(d.error || 'Não foi possível carregar a Tabela Nordeste.')
    } catch {
      setErroCarga('Sem conexão com o servidor.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function acrescentar(e: React.FormEvent) {
    e.preventDefault()
    setMensagem('')
    const nome = novo.trim()
    if (!nome) {
      setErroNovo('Escreva o nome do modelo, como aparece na cotação.')
      novoRef.current?.focus()
      return
    }
    setOcupado('novo')
    try {
      const res = await fetch('/api/admin/tabela-nordeste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setDados((x) => (x ? { ...x, utilitarios: d.utilitarios } : x))
        setNovo('')
        setErroNovo('')
        setMensagem(`${nome} entrou na lista de utilitários.`)
        novoRef.current?.focus()
      } else {
        setErroNovo(d.error || 'Não foi possível acrescentar o modelo. Tente de novo.')
        novoRef.current?.focus()
      }
    } catch {
      setErroNovo('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setOcupado('')
    }
  }

  async function tirar(nome: string) {
    setOcupado(nome)
    setMensagem('')
    try {
      const res = await fetch(`/api/admin/tabela-nordeste?nome=${encodeURIComponent(nome)}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setDados((x) => (x ? { ...x, utilitarios: d.utilitarios } : x))
        setMensagem(`${nome} saiu da lista: passa a usar a tabela de passeio.`)
        novoRef.current?.focus()
      } else setMensagem(d.error || 'Não foi possível tirar o modelo. Tente de novo.')
    } catch {
      setMensagem('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setOcupado('')
      setTirando('')
    }
  }

  if (erroCarga) {
    return (
      <div role="alert" className="rounded-xl border border-line bg-white p-6 text-sm text-navy-900">
        {erroCarga}{' '}
        <button type="button" onClick={load} className="font-semibold text-navy-600 underline-offset-2 hover:underline">
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!dados) {
    return (
      <div className="rounded-xl border border-line bg-white p-6" aria-busy="true">
        <div className="h-4 w-48 animate-pulse rounded bg-surface-100" />
        <div className="mt-4 h-40 w-full animate-pulse rounded bg-surface-100" />
      </div>
    )
  }

  const faixas = dados.tabelas[categoria]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy-900">Tabela regional</h1>
        <p className="m-0 mt-1 max-w-[70ch] text-sm text-muted">
          Quem mora no Rio Grande do Norte, na Paraíba ou no Ceará paga a mensalidade desta tabela, pela faixa da FIPE, no
          lugar do preço do CRM; o resto do Brasil paga o preço do CRM. O comprovante de residência confirma o estado, e
          FIPE acima da última faixa fica com o preço do CRM.
        </p>
      </div>

      <section aria-labelledby="utilitarios-titulo" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
        <div>
          <h2 id="utilitarios-titulo" className="m-0 text-base font-semibold text-navy-900">
            Modelos que usam a tabela de utilitário
          </h2>
          <p className="m-0 mt-1 text-sm text-muted">
            Picapes médias e grandes e SUVs. O site compara com o nome do modelo que a placa traz; o resto dos carros usa a
            tabela de passeio.
          </p>
        </div>

        <form onSubmit={acrescentar} noValidate className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
            <label htmlFor="utilitario-novo" className="text-sm font-semibold text-navy-800">
              Modelo
            </label>
            <input
              id="utilitario-novo"
              ref={novoRef}
              value={novo}
              onChange={(e) => {
                setNovo(e.target.value)
                if (erroNovo) setErroNovo('')
              }}
              placeholder="Ex.: Corolla Cross"
              maxLength={40}
              autoComplete="off"
              aria-invalid={erroNovo ? true : undefined}
              aria-describedby={erroNovo ? 'utilitario-erro' : undefined}
              className={campo}
            />
            {erroNovo && (
              <span id="utilitario-erro" className="text-sm text-red-700">
                {erroNovo}
              </span>
            )}
          </div>
          <button type="submit" disabled={ocupado === 'novo'} className={`${primario} sm:mt-[26px]`}>
            {ocupado === 'novo' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Plus aria-hidden className="h-4 w-4" />}
            Acrescentar modelo
          </button>
        </form>

        <p role="status" aria-live="polite" className="m-0 min-h-[1.25rem] text-sm text-navy-900">
          {mensagem}
        </p>

        <ul className="m-0 grid list-none gap-x-4 gap-y-1 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr))]">
          {dados.utilitarios.map((nome) => (
            <li key={nome} className="flex min-h-[44px] items-center justify-between gap-2 border-b border-line py-1 text-sm text-navy-900">
              {tirando === nome ? (
                <span className="flex w-full flex-wrap items-center justify-between gap-2">
                  <span>Tirar {nome}?</span>
                  <span className="flex gap-2">
                    <button type="button" onClick={() => tirar(nome)} disabled={ocupado === nome} className={`${btn} text-red-700`}>
                      {ocupado === nome && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                      Tirar
                    </button>
                    <button type="button" onClick={() => setTirando('')} className={btn}>
                      Cancelar
                    </button>
                  </span>
                </span>
              ) : (
                <>
                  <span>{nome}</span>
                  <button
                    type="button"
                    onClick={() => setTirando(nome)}
                    aria-label={`Tirar ${nome} da lista`}
                    className="min-h-[44px] rounded-lg px-2 text-sm font-semibold text-navy-600 hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600"
                  >
                    Tirar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faixas-titulo" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
        <div>
          <h2 id="faixas-titulo" className="m-0 text-base font-semibold text-navy-900">
            Faixas da tabela
          </h2>
          <p className="m-0 mt-1 text-sm text-muted">
            {dados.fonte}. Valor normal da mensalidade: o desconto de pagamento em dia e o do adesivo entram por cima, como
            nos outros planos.
          </p>
        </div>

        <div role="group" aria-label="Tipo de veículo" className="flex flex-wrap gap-1 rounded-[10px] bg-surface-100 p-1">
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
              className={`min-h-[44px] flex-[1_1_auto] rounded-lg px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600 ${
                categoria === c ? 'bg-white text-navy-900 shadow-sm' : 'text-muted hover:text-navy-900'
              }`}
            >
              {NOMES_CATEGORIA[c]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Tabela regional: {NOMES_CATEGORIA[categoria]}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th scope="col" className="px-2 py-2 sm:px-3">Cota</th>
                <th scope="col" className="px-2 py-2 sm:px-3">FIPE</th>
                <th scope="col" className="px-2 py-2 text-right sm:px-3">Mensalidade</th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((f) => (
                <tr key={f.cota} className="border-b border-line last:border-0">
                  <td className="px-2 py-2 tabular-nums text-navy-900 sm:px-3">{f.cota}</td>
                  <td className="px-2 py-2 tabular-nums text-navy-900 sm:px-3">
                    {f.de > 0 ? `${brl(f.de)} a ${brl(f.ate)}` : `Até ${brl(f.ate)}`}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums text-navy-900 sm:px-3">
                    {brl(f.mensalidade)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
