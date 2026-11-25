'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, MessageCircle, RefreshCw } from 'lucide-react'
import { mensagemDeRetomada } from '@/lib/carteira'
import type { DadosCarteira, ParadaNoPainel } from '@/lib/crm-carteira'
import { PendenciasEquipe } from '@/components/admin/PendenciasEquipe'

// Aba "Carteira" do /admin (padrão Dashboard): números do CRM 21Go e cotações paradas no funil do
// site. Só leitura no CRM; o WhatsApp de retomada sai só no clique, com o texto revisado aqui.

const btn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:text-muted'
const primario =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:bg-navy-600'
const cartao = 'rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(26,39,84,0.05)] sm:p-5'

const inteiro = (n: number) => new Intl.NumberFormat('pt-BR').format(n)
const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
const hora = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const diaHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const rotuloDia = (data: string) => {
  const d = new Date(`${data}T12:00:00Z`)
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', '')
  return { semana, dia: data.slice(8, 10) + '/' + data.slice(5, 7) }
}

/** "+100% sobre os 7 dias anteriores" (o CRM manda a variação em %). */
function variacao(delta: number | null, dias: number): string {
  if (delta === null) return ''
  if (delta === 0) return `Igual aos ${dias} dias anteriores`
  return `${delta > 0 ? '+' : '−'}${inteiro(Math.abs(Math.round(delta)))}% sobre os ${dias} dias anteriores`
}

function Numero({ titulo, valor, formato = inteiro, nota }: { titulo: string; valor: number | null; formato?: (n: number) => string; nota?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-white p-3">
      <dt className="text-xs font-semibold text-muted">{titulo}</dt>
      <dd className="m-0 text-2xl font-semibold tabular-nums tracking-tight text-navy-900">
        {valor === null ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">sem dado</span>
          </>
        ) : (
          formato(valor)
        )}
      </dd>
      {nota && <dd className="m-0 text-xs text-muted">{nota}</dd>}
    </div>
  )
}

/** Barras horizontais de uma cor só, com o número escrito ao lado (o funil). */
function Funil({ etapas, rotulo }: { etapas: { nome: string; total: number }[]; rotulo: string }) {
  const max = Math.max(1, ...etapas.map((e) => e.total))
  return (
    <ul aria-label={rotulo} className="m-0 flex list-none flex-col gap-2 p-0">
      {etapas.map((e) => (
        <li key={e.nome} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)_2.5rem]">
          <span className="truncate text-sm text-navy-900" title={e.nome}>
            {e.nome}
          </span>
          <span className="order-3 col-span-2 h-3 rounded-r bg-surface-100 sm:order-none sm:col-span-1" aria-hidden>
            <span className="block h-full rounded-r-[4px] bg-navy-600" style={{ width: `${e.total ? Math.max(2, (e.total / max) * 100) : 0}%` }} />
          </span>
          <span className="text-right text-sm font-semibold tabular-nums text-navy-900">{inteiro(e.total)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Entradas por dia: colunas de uma cor, valor em cima e o dia embaixo; a tabela fica para o leitor de tela. */
function EntradasPorDia({ dias }: { dias: DadosCarteira['dias'] }) {
  const max = Math.max(1, ...dias.map((d) => d.entradas))
  return (
    <figure className="m-0">
      <figcaption className="text-sm font-semibold text-navy-900">Entradas por dia</figcaption>
      <div aria-hidden className="mt-3 grid h-40 items-end gap-1.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}>
        {dias.map((d) => {
          const { semana, dia } = rotuloDia(d.data)
          return (
            <div key={d.data} className="flex h-full flex-col items-center justify-end gap-1" title={`${semana} ${dia}: ${d.entradas} ${d.entradas === 1 ? 'entrada' : 'entradas'}`}>
              <span className="text-xs font-semibold tabular-nums text-navy-900">{d.entradas}</span>
              <span className="w-full max-w-10 rounded-t-[4px] bg-navy-600" style={{ height: `${d.entradas ? Math.max(3, (d.entradas / max) * 100) : 0}%` }} />
              <span className="h-px w-full bg-line" />
              <span className="text-xs leading-tight text-muted">{semana}</span>
              <span className="text-xs leading-tight tabular-nums text-muted">{dia}</span>
            </div>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Entradas por dia</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Entradas</th>
            <th scope="col">Fechados</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((d) => (
            <tr key={d.data}>
              <th scope="row">{d.data.split('-').reverse().join('/')}</th>
              <td>{d.entradas}</td>
              <td>{d.fechados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function Parada({ p, aoEnviar }: { p: ParadaNoPainel; aoEnviar: (id: string, quando: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const caixaRef = useRef<HTMLTextAreaElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const nomeRef = useRef<HTMLParagraphElement>(null)
  const recente = p.enviadoEm && Date.now() - Date.parse(p.enviadoEm) < 24 * 60 * 60_000
  const idTexto = `retomada-${p.id}`

  useEffect(() => {
    if (aberto) caixaRef.current?.focus()
  }, [aberto])

  function abrir() {
    setTexto(mensagemDeRetomada({ nome: p.nome, veiculo: p.veiculo, placa: p.placa, propostaUrl: p.propostaUrl }))
    setErro('')
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setErro('')
    requestAnimationFrame(() => botaoRef.current?.focus())
  }

  async function mandar(e: React.FormEvent) {
    e.preventDefault()
    if (texto.trim().length < 10) {
      setErro('Escreva a mensagem antes de mandar.')
      caixaRef.current?.focus()
      return
    }
    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/carteira/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: p.id, texto }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.success) {
        setAberto(false)
        aoEnviar(p.id, d.enviadoEm)
        // O formulário some e o botão fica desligado: o foco vai para o nome do cliente.
        requestAnimationFrame(() => nomeRef.current?.focus())
      } else setErro(d.error || 'Não foi possível mandar. Tente de novo.')
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p ref={nomeRef} tabIndex={-1} className="m-0 text-sm font-semibold text-navy-900 outline-none">
            {p.nome || 'Cliente sem nome no CRM'}
          </p>
          <p className="m-0 mt-0.5 text-sm text-muted">
            {[p.placa, p.veiculo].filter(Boolean).join(' · ') || 'Sem placa no card'}
          </p>
          <p className="m-0 mt-1 text-xs text-navy-800">
            {p.fase} · parada há {p.dias} {p.dias === 1 ? 'dia' : 'dias'}
            {p.enviadoEm && <span className="text-muted"> · Mensagem mandada em {diaHora(p.enviadoEm)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.propostaUrl && (
            <a href={p.propostaUrl} target="_blank" rel="noopener noreferrer" className={btn}>
              <ExternalLink aria-hidden className="h-4 w-4" />
              Ver proposta
              <span className="sr-only">(abre em outra aba)</span>
            </a>
          )}
          {!aberto && (
            <button ref={botaoRef} type="button" onClick={abrir} disabled={Boolean(recente) || !p.telefoneFinal} className={btn}>
              <MessageCircle aria-hidden className="h-4 w-4" />
              Preparar WhatsApp
            </button>
          )}
        </div>
      </div>
      {!p.telefoneFinal && !aberto && <p className="m-0 text-xs text-muted">O card não tem WhatsApp. Confira o contato no CRM.</p>}
      {recente && !aberto && <p className="m-0 text-xs text-muted">Dá para mandar de novo 24 horas depois da última mensagem.</p>}

      {aberto && (
        <form onSubmit={mandar} noValidate className="flex flex-col gap-2 rounded-lg border border-line bg-surface-50 p-3">
          <label htmlFor={idTexto} className="text-sm font-semibold text-navy-800">
            Mensagem para o WhatsApp {p.telefoneFinal}
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
            rows={9}
            maxLength={1000}
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
              Revise o texto. Ele só sai quando você clicar em Mandar pelo WhatsApp.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={enviando} className={primario}>
              {enviando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <MessageCircle aria-hidden className="h-4 w-4" />}
              {enviando ? 'Mandando…' : 'Mandar pelo WhatsApp'}
            </button>
            <button type="button" onClick={fechar} disabled={enviando} className={btn}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </li>
  )
}

export function CarteiraPanel() {
  const [dados, setDados] = useState<DadosCarteira | null>(null)
  const [erro, setErro] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async (atualizar = false) => {
    setErro('')
    if (atualizar) setAtualizando(true)
    try {
      const res = await fetch(`/api/admin/carteira${atualizar ? '?atualizar=1' : ''}`, { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d.success) setDados(d.dados)
      else setErro(d.error || 'Não foi possível carregar a carteira.')
    } catch {
      setErro('Sem conexão com o servidor.')
    } finally {
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const aoEnviar = (id: string, quando: string) => {
    setDados((d) => (d ? { ...d, paradas: d.paradas.map((p) => (p.id === id ? { ...p, enviadoEm: quando } : p)) } : d))
    const p = dados?.paradas.find((x) => x.id === id)
    setAviso(`Mensagem mandada${p?.nome ? ` para ${p.nome}` : ''}.`)
  }

  // As pendências da equipe ficam sempre no mesmo lugar (logo abaixo do título), com o CRM
  // carregando, fora do ar ou respondendo: elas vêm do banco do site, não do CRM.
  const semDados = (corpo: React.ReactNode) => (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy-900">Carteira</h1>
          <p className="m-0 mt-1 text-sm text-muted">Números do CRM 21Go.</p>
        </div>
      </div>
      <PendenciasEquipe />
      {corpo}
    </div>
  )

  if (erro && !dados) {
    return semDados(
      <div role="alert" className="rounded-xl border border-line bg-white p-6 text-sm text-navy-900">
        {erro}{' '}
        <button type="button" onClick={() => carregar()} className="inline-flex min-h-[44px] items-center font-semibold text-navy-600 underline-offset-2 hover:underline">
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!dados) {
    return semDados(
      <div className="flex flex-col gap-4" aria-busy="true">
        <span className="sr-only">Carregando a carteira…</span>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr))]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-100" />
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-xl bg-surface-100" />
      </div>
    )
  }

  const k = dados.kpis
  const dias = dados.periodoDias
  const funilEmpresa = dados.funilCrm.some((e) => e.total > 0) ? dados.funilCrm : []
  const meu = dados.meuTrabalho
  const meuComMovimento =
    meu && [meu.simulacoes, meu.placas, meu.fechadas, meu.boletos.aVencer, meu.boletos.vencidos, meu.boletos.pagos, ...meu.colunas.map((c) => c.total)].some((n) => n > 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy-900">Carteira</h1>
          <p className="m-0 mt-1 text-sm text-muted">Números do CRM 21Go, lidos às {hora(dados.geradoEm)}. Atualizam sozinhos a cada 5 minutos.</p>
        </div>
        <button type="button" onClick={() => carregar(true)} disabled={atualizando} className={btn}>
          <RefreshCw aria-hidden className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
          {atualizando ? 'Atualizando…' : 'Atualizar agora'}
        </button>
      </div>

      <PendenciasEquipe />

      <div aria-live="polite">
        {aviso && <p className="m-0 rounded-xl border border-line bg-white p-4 text-sm text-navy-900">{aviso}</p>}
      </div>
      {erro && (
        <p role="alert" className="m-0 rounded-xl border border-line bg-white p-4 text-sm text-navy-900">
          {erro} Os números abaixo são da última leitura.
        </p>
      )}
      {dados.faltou.length > 0 && (
        <p role="note" className="m-0 rounded-xl border border-line bg-white p-4 text-sm text-navy-900">
          O CRM não mandou: {dados.faltou.join(' e ')}. O resto está abaixo; tente Atualizar agora em instantes.
        </p>
      )}

      {k && (
        <section aria-labelledby="carteira-periodo" className={cartao}>
          <h2 id="carteira-periodo" className="m-0 text-base font-semibold text-navy-900">
            Últimos {dias} dias
          </h2>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero titulo="Entradas" valor={k.entradas} nota={variacao(k.entradasDelta, dias)} />
            <Numero titulo="Fechados" valor={k.fechados} nota={variacao(k.fechadosDelta, dias)} />
            <Numero titulo="Receita" valor={k.receita} formato={brl} nota={variacao(k.receitaDelta, dias)} />
            <Numero titulo="Conversão" valor={k.taxaConversao} formato={(n) => `${inteiro(Math.round(n))}%`} />
          </dl>
          {dados.dias.length > 0 && (
            <div className="mt-5">
              <EntradasPorDia dias={dados.dias} />
            </div>
          )}
        </section>
      )}

      {k && (
        <section aria-labelledby="carteira-agora" className={cartao}>
          <h2 id="carteira-agora" className="m-0 text-base font-semibold text-navy-900">
            Agora no CRM
          </h2>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero titulo="Em atendimento" valor={k.emAtendimento} />
            <Numero titulo="Em negociação" valor={k.emNegociacao} />
            <Numero titulo="Em vistoria" valor={k.emVistoria} />
            <Numero titulo="Prestes a fechar" valor={k.prestesAFechar} />
            <Numero titulo="Pendências do cliente" valor={k.pendenciasCliente} />
            <Numero titulo="Aguardando aprovação" valor={k.aguardandoAprovacao} />
            <Numero
              titulo="Associados"
              valor={k.associadosTotal}
              nota={k.associadosAtivos === null ? undefined : `${inteiro(k.associadosAtivos)} ${k.associadosAtivos === 1 ? 'ativo' : 'ativos'}`}
            />
            <Numero titulo="Veículos protegidos" valor={k.veiculosProtegidos} />
          </dl>
        </section>
      )}

      <section aria-labelledby="carteira-paradas" className={cartao}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="carteira-paradas" className="m-0 text-base font-semibold text-navy-900">
            Cotações paradas{dados.paradas.length ? `: ${dados.paradas.length}` : ''}
          </h2>
          <p className="m-0 text-xs text-muted">No começo do funil e sem andar há mais de 2 dias.</p>
        </div>
        {dados.paradas.length ? (
          <ul className="m-0 mt-4 list-none p-0">
            {dados.paradas.map((p) => (
              <Parada key={p.id} p={p} aoEnviar={aoEnviar} />
            ))}
          </ul>
        ) : (
          <p className="m-0 mt-3 text-sm text-navy-900">
            {dados.faltou.includes('funil do site')
              ? 'Não deu para ler o funil do site agora.'
              : 'Nenhuma cotação parada: todas andaram nos últimos 2 dias.'}
          </p>
        )}
      </section>

      {dados.funilSite.length > 0 && (
        <section aria-labelledby="carteira-funil" className={cartao}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="carteira-funil" className="m-0 text-base font-semibold text-navy-900">
              Funil do site no CRM
            </h2>
            <p className="m-0 text-xs text-muted">
              {inteiro(dados.totalCards)} {dados.totalCards === 1 ? 'cotação' : 'cotações'} no funil
            </p>
          </div>
          <div className="mt-4">
            <Funil etapas={dados.funilSite} rotulo="Cotações do site em cada fase" />
          </div>
        </section>
      )}

      {funilEmpresa.length > 0 && (
        <section aria-labelledby="carteira-funil-empresa" className={cartao}>
          <h2 id="carteira-funil-empresa" className="m-0 text-base font-semibold text-navy-900">
            Funil da empresa no CRM
          </h2>
          <div className="mt-4">
            <Funil etapas={funilEmpresa} rotulo="Negociações da empresa em cada etapa" />
          </div>
        </section>
      )}

      {meu && meuComMovimento && (
        <section aria-labelledby="carteira-meu" className={cartao}>
          <h2 id="carteira-meu" className="m-0 text-base font-semibold text-navy-900">
            Trabalho do usuário do site no CRM
          </h2>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero titulo="Simulações" valor={meu.simulacoes} />
            <Numero titulo="Placas" valor={meu.placas} />
            <Numero titulo="Fechadas" valor={meu.fechadas} />
            <Numero titulo="Boletos a vencer" valor={meu.boletos.aVencer} />
            <Numero titulo="Boletos vencidos" valor={meu.boletos.vencidos} />
            <Numero titulo="Boletos pagos" valor={meu.boletos.pagos} />
          </dl>
        </section>
      )}
    </div>
  )
}
