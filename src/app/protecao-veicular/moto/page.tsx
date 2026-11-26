import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { SiteFooter } from '@/components/home/SiteChrome'
import { CabecalhoSimples } from '@/components/home/CabecalhoSimples'
import { CotarPelaPlaca } from '@/components/home/CotarPelaPlaca'

// Padrão de página: Landing de marketing (navegação → hero com a cotação → seções → perguntas →
// chamada → rodapé). Uma página só para moto (moto por cidade dobraria as páginas finas).

export const metadata: Metadata = {
  title: 'Proteção veicular para moto: cotação pela placa',
  description:
    'Proteção veicular 21Go para moto: cotação pela placa, sem consulta ao SPC/Serasa, sem análise de perfil e vistoria pelo celular. CITmax, consultor autorizado.',
  alternates: { canonical: '/protecao-veicular/moto' },
}

const PONTOS = [
  'Roubo, furto e perda total: 100% da Tabela FIPE, sem cota',
  'Colisão e fenômenos da natureza, com cota de participação de 15% da FIPE no conserto',
  'Guincho de 1.000 km e assistência 24h em todo o Brasil',
  'Sem análise de perfil e sem consulta ao SPC/Serasa',
  'Motos de 2006 em diante; documentos e vistoria pelo celular',
]

const PERGUNTAS = [
  {
    p: 'A promoção do plano VIP vale para moto?',
    r: 'Não. A promoção do VIP pela tabela regional é só para carro. Para moto, a cotação mostra os planos de moto com os valores para o seu veículo.',
  },
  {
    p: 'Motoboy e entregador podem contratar?',
    r: 'Podem. A 21Go não faz análise de perfil nem consulta ao SPC/Serasa.',
  },
  {
    p: 'O que a moto não tem?',
    r: 'Moto não tem táxi nem moto reserva, e danos a terceiros só entra como adicional, se você pedir. Moto de leilão ou com chassi remarcado não é aceita.',
  },
  {
    p: 'Quanto pago se a moto cair ou bater?',
    r: 'Só a cota de participação, de 15% do valor da FIPE da moto. A 21Go paga o resto direto à oficina.',
  },
]

export default function MotoPage() {
  return (
    <>
      <CabecalhoSimples />
      <main id="conteudo">
        <section className="bg-navy-950 px-6 py-12 text-white sm:py-16">
          <div className="mx-auto grid max-w-[1200px] items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex min-w-0 flex-col gap-4">
              <span className="text-xs font-bold tracking-[1.5px] text-go-orange">PROTEÇÃO VEICULAR · MOTO</span>
              <h1 className="m-0 text-[34px] font-extrabold leading-[1.1] tracking-[-1px] sm:text-[46px]">Proteção veicular para moto</h1>
              <p className="m-0 max-w-[60ch] text-[17px] leading-relaxed text-muted-soft">
                Cote a proteção da sua moto pela placa e veja os planos na hora. A CITmax, consultor autorizado da 21Go, faz todo o
                atendimento pelo WhatsApp, e a vistoria é por fotos no celular.
              </p>
            </div>
            <div className="text-navy-900">
              <CotarPelaPlaca uf="" />
            </div>
          </div>
        </section>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-12 sm:py-16">
          <section aria-labelledby="moto-pontos" className="flex flex-col gap-5">
            <h2 id="moto-pontos" className="m-0 text-2xl font-extrabold tracking-[-0.5px] text-navy-900 sm:text-[28px]">
              Como funciona para moto
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
              {PONTOS.map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 text-[15px] leading-snug text-navy-800">
                  <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
                  {t}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="moto-perguntas" className="flex flex-col gap-4">
            <h2 id="moto-perguntas" className="m-0 text-2xl font-extrabold tracking-[-0.5px] text-navy-900 sm:text-[28px]">
              Perguntas sobre a proteção da moto
            </h2>
            <div className="flex flex-col gap-3">
              {PERGUNTAS.map((f) => (
                <details key={f.p} className="rounded-xl border border-line bg-white">
                  <summary className="flex min-h-[56px] cursor-pointer items-center px-5 py-4 text-[17px] font-semibold text-navy-800">{f.p}</summary>
                  <p className="m-0 px-5 pb-5 leading-relaxed text-muted">{f.r}</p>
                </details>
              ))}
            </div>
          </section>
          <p className="m-0 text-[15px] text-muted">
            <a href="/protecao-veicular" className="font-semibold text-navy-600 underline">
              Cidades atendidas
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
