import type { Metadata } from 'next'
import { SiteFooter } from '@/components/home/SiteChrome'
import { CabecalhoSimples } from '@/components/home/CabecalhoSimples'
import { cidadesPorEstado } from '@/lib/cidades'

// Padrão de página: Landing de marketing curta (navegação → título → lista de cidades por estado →
// chamada → rodapé). As cidades vêm de src/lib/cidades.ts.

export const metadata: Metadata = {
  title: 'Proteção veicular no RN, na Paraíba e no Ceará',
  description:
    'Cidades atendidas pela CITmax, consultor autorizado da 21Go: cotação da proteção veicular pela placa, com a tabela regional para quem mora no RN, na Paraíba e no Ceará.',
  alternates: { canonical: '/protecao-veicular' },
}

export default function ProtecaoVeicularPage() {
  const grupos = cidadesPorEstado()
  return (
    <>
      <CabecalhoSimples />
      <main id="conteudo" className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-12 sm:py-16">
        <div className="flex max-w-[70ch] flex-col gap-3">
          <span className="text-xs font-bold tracking-[1.5px] text-navy-600">CIDADES ATENDIDAS</span>
          <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-[-1px] text-navy-900 sm:text-[42px]">
            Proteção veicular 21Go no RN, na Paraíba e no Ceará
          </h1>
          <p className="m-0 text-[17px] leading-relaxed text-muted">
            A cotação é pela placa e todo o resto é pelo celular, de qualquer cidade. Para carro, quem mora nesses três estados
            tem o plano VIP pela tabela regional, em promoção. Escolha a sua cidade para ver como funciona aí.
          </p>
        </div>

        {grupos.map((g) => (
          <section key={g.uf} aria-labelledby={`uf-${g.uf}`} className="flex flex-col gap-4">
            <h2 id={`uf-${g.uf}`} className="m-0 text-2xl font-extrabold text-navy-900">
              {g.nome}
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
              {g.cidades.map((c) => (
                <li key={c.slug}>
                  <a
                    href={`/protecao-veicular/${c.slug}`}
                    className="flex min-h-[64px] flex-col justify-center rounded-xl border border-line bg-white px-5 py-3 shadow-[0_1px_2px_rgba(26,39,84,0.05)] hover:border-navy-600"
                  >
                    <span className="text-[17px] font-bold text-navy-900">{c.nome}</span>
                    <span className="text-sm text-muted">{c.regiao}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="m-0 text-[15px] text-muted">
          Mora em outra cidade? A cotação e a contratação são online para todo o Brasil.{' '}
          <a href="/#cotacao" className="font-semibold text-navy-600 underline">
            Cotar pela placa
          </a>{' '}
          ·{' '}
          <a href="/protecao-veicular/moto" className="font-semibold text-navy-600 underline">
            Proteção para moto
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
