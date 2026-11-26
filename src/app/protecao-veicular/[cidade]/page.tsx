import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { SiteFooter } from '@/components/home/SiteChrome'
import { CabecalhoSimples } from '@/components/home/CabecalhoSimples'
import { CotarPelaPlaca } from '@/components/home/CotarPelaPlaca'
import { CIDADES, NOME_UF, cidadePorSlug, noEstado } from '@/lib/cidades'

// Padrão de página: Landing de marketing (navegação → hero com a cotação → seções → perguntas →
// chamada → rodapé). Texto próprio de cada cidade em src/lib/cidades.ts.

export const dynamicParams = false

export function generateStaticParams() {
  return CIDADES.filter((c) => c.publicada).map((c) => ({ cidade: c.slug }))
}

type Params = { params: Promise<{ cidade: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = cidadePorSlug((await params).cidade)
  if (!c) return {}
  const titulo = `Proteção veicular em ${c.nome} (${c.uf}): cotação pela placa`
  const descricao = `Proteção veicular 21Go em ${c.nome}, ${NOME_UF[c.uf]}: cotação pela placa, 100% da Tabela FIPE, sem consulta ao SPC/Serasa e vistoria pelo celular. CITmax, consultor autorizado.`
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/protecao-veicular/${c.slug}` },
    openGraph: { title: titulo, description: descricao, url: `/protecao-veicular/${c.slug}` },
  }
}

const COBERTURAS = [
  'Indenização de 100% da Tabela FIPE em roubo, furto e perda total, sem cota',
  'Na batida, a 21Go paga o conserto direto à oficina e você paga só a cota de participação',
  'Livre condutor: qualquer pessoa dirige, sem restrição de idade',
  'Assistência 24h em todo o Brasil: guincho, chaveiro, troca de pneu e pane',
  'Danos a terceiros de R$ 5 mil a R$ 100 mil, conforme o plano',
  'Sem análise de perfil e sem consulta ao SPC/Serasa',
]

const PASSOS = [
  ['Cote pela placa', 'Os planos aparecem na hora, com os valores oficiais da 21Go para o seu veículo.'],
  ['Mande os documentos e faça a vistoria', 'CNH ou RG, documento do veículo e comprovante de residência, e as fotos do veículo pelo celular.'],
  ['Pague a adesão por Pix', 'Com a vistoria aprovada, o Pix chega no WhatsApp: roubo e furto valem na hora, e o resto em 72 horas úteis.'],
]

const URL_SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br').replace(/\/+$/, '')

export default async function CidadePage({ params }: Params) {
  const c = cidadePorSlug((await params).cidade)
  if (!c) notFound()
  const vizinhas = c.vizinhas.map((s) => cidadePorSlug(s)).filter((v): v is NonNullable<typeof v> => !!v)
  const url = `${URL_SITE}/protecao-veicular/${c.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: `Proteção veicular 21Go em ${c.nome}`,
        serviceType: 'Proteção veicular',
        url,
        provider: { '@id': `${URL_SITE}/#citmax` },
        brand: { '@type': 'Brand', name: '21Go Proteção Veicular' },
        areaServed: { '@type': 'City', name: c.nome, containedInPlace: { '@type': 'State', name: NOME_UF[c.uf] } },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${URL_SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Proteção veicular por cidade', item: `${URL_SITE}/protecao-veicular` },
          { '@type': 'ListItem', position: 3, name: c.nome, item: url },
        ],
      },
    ],
  }

  const h2 = 'm-0 text-2xl font-extrabold tracking-[-0.5px] text-navy-900 sm:text-[28px]'

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CabecalhoSimples />

      <main id="conteudo">
        <section className="bg-navy-950 px-6 pb-12 pt-6 text-white sm:pb-16">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
            <nav aria-label="Você está em" className="text-sm text-muted-dark">
              <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
                <li>
                  <a href="/" className="text-muted-dark underline-offset-2 hover:text-white hover:underline">
                    Início
                  </a>
                </li>
                <li aria-hidden>
                  <ChevronRight className="h-4 w-4" />
                </li>
                <li>
                  <a href="/protecao-veicular" className="text-muted-dark underline-offset-2 hover:text-white hover:underline">
                    Proteção veicular
                  </a>
                </li>
                <li aria-hidden>
                  <ChevronRight className="h-4 w-4" />
                </li>
                <li aria-current="page" className="text-white">
                  {c.nome}
                </li>
              </ol>
            </nav>
            <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div className="flex min-w-0 flex-col gap-4">
                <span className="text-xs font-bold tracking-[1.5px] text-go-orange">
                  PROTEÇÃO VEICULAR · {c.regiao.toUpperCase()}
                </span>
                <h1 className="m-0 text-[34px] font-extrabold leading-[1.1] tracking-[-1px] sm:text-[46px]">
                  Proteção veicular em {c.nome} ({c.uf})
                </h1>
                {c.intro.map((t) => (
                  <p key={t} className="m-0 max-w-[60ch] text-[17px] leading-relaxed text-muted-soft">
                    {t}
                  </p>
                ))}
              </div>
              <div className="text-navy-900">
                <CotarPelaPlaca uf={c.uf} cidade={c.nome} />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-12 sm:py-16">
          <section aria-labelledby="tabela" className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-go-orange bg-white p-6 shadow-card">
              <h2 id="tabela" className="m-0 text-xl font-extrabold text-navy-900">
                Tabela regional para quem mora {noEstado(c.uf)}
              </h2>
              <p className="m-0 leading-relaxed text-navy-800">
                Para carro, quem mora em {c.nome} tem o plano VIP pela tabela regional da 21Go, em promoção. Acima do limite de
                valor da tabela, vale o preço nacional. O comprovante de residência confirma o estado, e a cotação já mostra o
                preço certo.
              </p>
              <p className="m-0 text-sm text-muted">
                Para moto, a cotação mostra os planos de moto; a promoção do VIP é só para carro.{' '}
                <a href="/protecao-veicular/moto" className="font-semibold text-navy-600 underline">
                  Proteção para moto
                </a>
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="m-0 text-xl font-extrabold text-navy-900">No dia a dia de {c.nome}</h2>
              <p className="m-0 leading-relaxed text-navy-800">{c.rotina}</p>
            </div>
          </section>

          <section aria-labelledby="cobre" className="flex flex-col gap-5">
            <h2 id="cobre" className={h2}>
              O que a proteção da 21Go cobre
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
              {COBERTURAS.map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 text-[15px] leading-snug text-navy-800">
                  <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="m-0 text-sm text-muted">
              O que muda de um plano para outro (guincho, carro reserva, terceiros) aparece na cotação.
            </p>
          </section>

          <section aria-labelledby="como" className="flex flex-col gap-5">
            <h2 id="como" className={h2}>
              Como contratar de {c.nome}
            </h2>
            <ol className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
              {PASSOS.map(([t, d], i) => (
                <li key={t} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-sm font-extrabold text-white">{i + 1}</span>
                  <span className="text-lg font-bold text-navy-900">{t}</span>
                  <span className="text-[15px] leading-relaxed text-muted">{d}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="perguntas" className="flex flex-col gap-4">
            <h2 id="perguntas" className={h2}>
              Perguntas de quem mora em {c.nome}
            </h2>
            <div className="flex flex-col gap-3">
              {c.faqs.map((f) => (
                <details key={f.p} className="group rounded-xl border border-line bg-white">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[17px] font-semibold text-navy-800">
                    {f.p}
                    <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-navy-600 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="m-0 px-5 pb-5 leading-relaxed text-muted">{f.r}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="perto" className="flex flex-col gap-4 rounded-2xl bg-surface-100 p-6">
            <h2 id="perto" className="m-0 text-xl font-extrabold text-navy-900">
              Outras cidades atendidas
            </h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {vizinhas.map((v) => (
                <li key={v.slug}>
                  <a
                    href={`/protecao-veicular/${v.slug}`}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-line bg-white px-4 text-[15px] font-semibold text-navy-800 hover:border-navy-600"
                  >
                    {v.nome} ({v.uf})
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/protecao-veicular"
                  className="inline-flex min-h-[44px] items-center rounded-lg px-4 text-[15px] font-semibold text-navy-600 underline"
                >
                  Ver todas
                </a>
              </li>
            </ul>
          </section>

          <section className="flex flex-col items-start gap-4 rounded-2xl bg-navy-950 p-6 text-white sm:p-8">
            <h2 className="m-0 text-2xl font-extrabold">Veja o preço para o seu veículo</h2>
            <p className="m-0 text-muted-soft">Leva menos de um minuto e não precisa de cadastro para ver os valores.</p>
            <a href="/#cotacao" className="inline-flex min-h-[48px] items-center rounded-lg bg-go-orange px-6 font-extrabold text-navy-950">
              Cotar pela placa
            </a>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
