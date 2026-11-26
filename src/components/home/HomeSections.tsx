'use client'

import { useState, type ReactNode } from 'react'
import { Revelar } from '@/components/common/Revelar'
import {
  Check,
  ChevronDown,
  CloudRain,
  Car,
  CarFront,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
} from 'lucide-react'
import { whatsappUrl } from '@/lib/site'

const h2 = 'm-0 text-[32px] font-extrabold leading-[1.1] tracking-[-1.2px] sm:text-[44px]'

export function Stats() {
  const items = [
    ['20+ anos', 'de mercado'],
    ['100% FIPE', 'em roubo, furto e perda total'],
    ['Na hora', 'roubo e furto protegidos, depois da vistoria e do Pix'],
    ['24h', 'de assistência em todo o país'],
  ]
  return (
    <section aria-label="21Go em números" className="border-b border-line bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-8 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {items.map(([big, small]) => (
          <div key={big} className="flex flex-col gap-1">
            <span className="text-4xl font-extrabold tracking-[-1px] text-navy-800">{big}</span>
            <span className="text-[15px] text-muted">{small}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

const COBERTURAS = [
  {
    icon: ShieldCheck,
    title: 'Roubo, furto e colisão',
    text: 'Indenização de 100% da Tabela FIPE em roubo, furto e perda total, sem cota. Na batida, a 21Go paga o conserto direto à oficina e você paga só a cota de participação.',
  },
  {
    icon: LifeBuoy,
    title: 'Assistência 24 horas',
    text: 'Guincho em todo o território nacional, chaveiro, troca de pneu, pane seca, pane elétrica e recarga de bateria.',
  },
  {
    icon: Car,
    title: 'Danos a terceiros',
    text: 'Cobertura de R$ 5 mil a R$ 100 mil para danos materiais a outros veículos, conforme o plano escolhido.',
  },
  {
    icon: KeyRound,
    title: 'Carro reserva',
    text: '7 dias no VIP em caso de roubo ou furto e 15 dias no Premium, para você não ficar a pé.',
  },
  {
    icon: CloudRain,
    title: 'Fenômenos da natureza',
    text: 'Enchente, alagamento, queda de árvore e granizo, a partir do plano Do Seu Jeito. Incêndio decorrente de colisão está coberto em todos os planos.',
  },
  {
    icon: CarFront,
    title: 'Vidros',
    text: 'Para-brisa com 70% da troca em todos os planos. No Premium, todos os vidros, espelhos e faróis.',
  },
]

export function Coberturas() {
  return (
    <section id="coberturas" className="scroll-mt-20 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <Revelar className="flex max-w-[680px] flex-col gap-3">
          <h2 className={h2}>O que a proteção cobre</h2>
          <p className="m-0 text-lg leading-relaxed text-muted">
            Em todo o Brasil. O que muda de um plano para outro está na lista dos planos e na sua cotação.
          </p>
        </Revelar>
        <Revelar atraso={60} className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {COBERTURAS.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-7 shadow-card"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100">
                <Icon aria-hidden className="h-6 w-6 text-navy-600" />
              </span>
              <h3 className="m-0 text-xl font-bold">{title}</h3>
              <p className="m-0 leading-relaxed text-muted">{text}</p>
            </article>
          ))}
        </Revelar>
      </div>
    </section>
  )
}

const PLANOS = [
  {
    name: 'Básico',
    desc: 'O essencial para rodar protegido.',
    items: ['Roubo, furto e colisão', 'Terceiros até R$ 5 mil', 'Guincho 200 km', 'Assistência 24h', 'Para-brisa (70% da troca)', 'Clube de benefícios'],
  },
  {
    name: 'Do Seu Jeito',
    desc: 'Mais cobertura por pouco a mais.',
    items: ['Tudo do Básico', 'Fenômenos da natureza', 'Terceiros até R$ 10 mil', 'Guincho 400 km', 'Táxi 50 km', 'Carro amigo 25 km'],
  },
  {
    name: 'VIP',
    desc: 'O equilíbrio ideal para o dia a dia.',
    popular: true,
    items: ['Tudo do Do Seu Jeito', 'Terceiros até R$ 50 mil', 'Guincho 1.000 km', 'Carro reserva 7 dias (roubo e furto)', 'Táxi 100 km'],
  },
  {
    name: 'Premium',
    desc: 'A proteção mais completa.',
    items: ['Tudo do VIP', 'Terceiros até R$ 100 mil', 'Guincho 1.400 km', 'Carro reserva 15 dias', 'Todos os vidros, espelhos e faróis', 'Táxi 150 km'],
  },
]

/** Vitrine dos planos na home (os valores reais aparecem após a cotação). */
export function PlanosPreview() {
  return (
    <section id="planos" className="scroll-mt-20 bg-surface-100 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <Revelar className="flex max-w-[640px] flex-col gap-3">
          <h2 className={h2}>Escolha o plano do seu jeito</h2>
          <p className="m-0 text-lg leading-relaxed text-muted">
            Para carros, motos, SUVs e especiais. O valor depende do modelo e do ano — consulte pela placa para ver o seu.
          </p>
        </Revelar>
        <Revelar atraso={60} className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]">
          {PLANOS.map((p) => (
            <article
              key={p.name}
              className={`flex flex-col gap-5 rounded-2xl p-7 transition duration-150 hover:-translate-y-0.5 ${
                p.popular
                  ? 'border-2 border-go-orange bg-navy-950 text-white shadow-[0_16px_40px_rgba(11,18,48,0.25)]'
                  : 'border border-line bg-white hover:border-navy-500'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                {p.popular && (
                  <span className="self-start rounded-full bg-go-orange px-3 py-1 text-xs font-extrabold text-navy-950">
                    Mais escolhido
                  </span>
                )}
                <h3 className="m-0 text-[22px] font-extrabold">{p.name}</h3>
                <p className={`m-0 text-[15px] ${p.popular ? 'text-muted-soft' : 'text-muted'}`}>{p.desc}</p>
              </div>
              <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 p-0 text-[15px] leading-snug">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5">
                    <Check aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-go-orange" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#cotacao"
                className={`flex min-h-[48px] items-center justify-center rounded-lg font-bold no-underline ${
                  p.popular
                    ? 'bg-go-orange font-extrabold text-navy-950 transition hover:-translate-y-px hover:shadow-cta'
                    : 'border-2 border-navy-800 text-navy-800'
                }`}
              >
                Ver preço
              </a>
            </article>
          ))}
        </Revelar>
      </div>
    </section>
  )
}

export function ComoFunciona() {
  const steps = [
    ['01', 'Cote pela placa', 'Em 30 segundos você vê os planos e valores para o seu veículo.', false],
    ['02', 'Escolha o plano e envie os documentos', 'CNH ou RG, documento do carro e comprovante de residência, pelo celular.', false],
    ['03', 'Vistoria no App Visto', 'Fotos do veículo na vistoria oficial da 21Go, pelo link no WhatsApp.', false],
    ['04', 'Adesão no Pix e pronto', 'Com a vistoria aprovada, você paga a adesão por Pix e recebe o contrato por e-mail.', true],
  ] as const
  return (
    <section id="como-funciona" className="scroll-mt-20 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <Revelar className="flex max-w-[640px] flex-col gap-3">
          <h2 className={h2}>Como contratar, em 4 passos e sem sair de casa</h2>
        </Revelar>
        <Revelar atraso={60}>
        <ol className="m-0 grid list-none gap-6 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {steps.map(([n, title, text, last]) => (
            <li
              key={n}
              className={`flex flex-col gap-3 border-t-[3px] pt-5 ${last ? 'border-go-lime' : 'border-go-orange'}`}
            >
              <span className={`text-sm font-extrabold ${last ? 'text-[#6b7200]' : 'text-go-orange-dark'}`}>{n}</span>
              <h3 className="m-0 text-xl font-bold">{title}</h3>
              <p className="m-0 leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
        </Revelar>
      </div>
    </section>
  )
}

/**
 * As regras do contrato (Manual do Consultor 21Go, edição 2026), abertas e num lugar só: quem entra,
 * quando começa, quanto custa usar, como é a mensalidade e como sair. Os números são do manual.
 */
const ACEITAMOS = [
  'Nome negativado, sem consulta ao SPC/Serasa',
  'Motorista de aplicativo',
  'Carros e motos de 2006 em diante',
  'Carros de leilão (80% da FIPE)',
  'Carro financiado ou em nome de outra pessoa',
  'Motos até 1.000 cc',
]

const CARENCIA = [
  {
    quando: 'Na hora',
    texto: 'Roubo e furto, logo depois da vistoria aprovada e do Pix da adesão.',
    cor: 'text-go-orange',
    ponto: 'bg-go-orange',
  },
  {
    quando: '72 horas úteis',
    texto: 'Colisão, guincho, assistência 24h e, nos planos que têm, fenômenos da natureza.',
    cor: 'text-go-lime',
    ponto: 'bg-go-lime',
  },
]

const COTA = [
  ['6%', 'Carro'],
  ['10%', 'Elétrico e híbrido'],
  ['15%', 'Moto'],
]

const DESCONTOS = [
  ['5%', 'pagando até 5 dias antes do vencimento'],
  ['até 15%', 'no carro, com o adesivo da 21Go no vidro traseiro'],
]

function Regra({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-navy-800/25 pt-6">
      <h3 className="m-0 text-xl font-bold text-navy-900">{titulo}</h3>
      {children}
    </div>
  )
}

export function Regras() {
  return (
    <section id="regras" aria-labelledby="regras-titulo" className="scroll-mt-20 bg-surface-100 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 sm:gap-12">
        <Revelar className="flex max-w-[640px] flex-col gap-3">
          <h2 id="regras-titulo" className={h2}>
            As regras, do começo ao fim
          </h2>
          <p className="m-0 text-lg leading-relaxed text-muted">
            Como estão no contrato da 21Go, para você decidir sabendo de tudo.
          </p>
        </Revelar>

        <Revelar atraso={60} className="rounded-2xl bg-navy-950 p-6 text-white sm:p-10">
          <h3 className="m-0 text-xl font-bold">Quando a proteção começa?</h3>
          <ol className="m-0 mt-8 grid list-none gap-8 p-0 sm:grid-cols-2 sm:gap-10">
            {CARENCIA.map((c, i) => (
              <li key={c.quando} className="relative flex flex-col gap-2 pl-9 sm:pl-0 sm:pt-10">
                <span aria-hidden className={`absolute left-0 top-3 h-4 w-4 rounded-full ${c.ponto} sm:top-0`} />
                {i === 0 && (
                  // Linha até o próximo ponto: para baixo no celular, para o lado no computador.
                  <span
                    aria-hidden
                    className="absolute -bottom-11 left-[7px] top-7 w-0.5 bg-navy-500 sm:-right-10 sm:bottom-auto sm:left-4 sm:top-[7px] sm:h-0.5 sm:w-auto"
                  />
                )}
                <span className={`text-[40px] font-extrabold leading-none tracking-[-1.5px] sm:text-[56px] ${c.cor}`}>
                  {c.quando}
                </span>
                <span className="max-w-[44ch] text-[17px] leading-relaxed text-muted-soft">{c.texto}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-8 border-t border-navy-line pt-5 text-[15px] text-muted-dark">
            Não existe carência de 90 dias.
          </p>
        </Revelar>

        <Revelar atraso={90} className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          <Regra titulo="Quem pode entrar?">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {ACEITAMOS.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-navy-800">
                  <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
                  {t}
                </li>
              ))}
            </ul>
          </Regra>

          <Regra titulo="Se eu bater, quanto pago?">
            <dl className="m-0 grid grid-cols-3 gap-4">
              {COTA.map(([n, v]) => (
                <div key={v} className="flex flex-col-reverse justify-end gap-1.5">
                  <dt className="text-[15px] leading-snug text-muted">{v}</dt>
                  <dd className="m-0 text-[36px] font-extrabold leading-none tracking-[-1px] text-navy-900">{n}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0 leading-relaxed text-muted">
              É a cota de participação: uma parte do valor da FIPE do veículo, paga só quando há conserto. A 21Go paga
              o resto direto à oficina. Roubo, furto e perda total não têm cota.
            </p>
          </Regra>

          <Regra titulo="Como é a mensalidade?">
            <p className="m-0 leading-relaxed text-muted">
              O valor depende da FIPE do veículo e do plano e não tem reajuste anual. Pode haver um pequeno rateio,
              conforme os roubos e acidentes do grupo, e o desconto de 5% por pagar em dia cobre essa diferença. A
              primeira mensalidade vence no mês seguinte à ativação, e você paga por boleto, Pix ou cartão no aplicativo
              da 21Go.
            </p>
            <div className="flex flex-col gap-2">
              <p className="m-0 font-semibold text-navy-900">Descontos, que se somam:</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {DESCONTOS.map(([n, t]) => (
                  <li key={t} className="flex items-baseline gap-3 text-navy-800">
                    <span className="min-w-[4.5rem] shrink-0 font-extrabold text-navy-900">{n}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Regra>

          <Regra titulo="E se eu quiser sair?">
            <ul className="m-0 flex list-none flex-col gap-3 p-0 leading-relaxed text-muted">
              <li>
                <strong className="font-semibold text-navy-900">Sem fidelidade e sem multa de cancelamento.</strong> Com
                os boletos pagos, é só avisar 10 dias antes do vencimento. Se o veículo tiver rastreador, ele precisa
                ser devolvido.
              </li>
              <li>
                <strong className="font-semibold text-navy-900">Não concordou com o contrato?</strong> Ele chega por
                e-mail depois da ativação, com o prazo para ler e cancelar com reembolso escrito nele (de 3 a 7 dias).
              </li>
              <li>
                <strong className="font-semibold text-navy-900">Vendeu o veículo?</strong> O plano não passa para o
                novo: você cancela o atual e faz nova vistoria e nova adesão.
              </li>
            </ul>
          </Regra>
        </Revelar>
      </div>
    </section>
  )
}

export function Comparativo() {
  const rows = [
    ['Como funciona', 'Os associados dividem entre si o custo dos imprevistos', 'A seguradora vende uma apólice e assume o risco'],
    ['Quem pode dirigir', 'Livre condutor, sem restrição de idade', 'Geralmente depende do perfil do motorista'],
    ['Carro de aplicativo', 'Aceita, sem mudar valor nem indenização', 'Costuma encarecer ou recusar'],
    ['Fidelidade', 'Sem fidelidade e sem multa de cancelamento', 'Contrato anual'],
    ['Indenização', '100% da Tabela FIPE', 'Varia conforme a apólice'],
  ]
  return (
    <section id="por-que" className="scroll-mt-20 border-y border-line bg-white px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
        <Revelar className="flex max-w-[640px] flex-col gap-3">
          <h2 className={h2}>Proteção veicular x seguro tradicional</h2>
        </Revelar>
        {/* Celular: um cartão por item, para as duas colunas caberem sem rolar para o lado. */}
        <Revelar atraso={60} className="flex flex-col gap-3 sm:hidden">
          {rows.map(([k, a, b]) => (
            <dl key={k} className="m-0 flex flex-col gap-2 rounded-xl border border-line p-4">
              <dt className="text-sm font-bold text-navy-600">{k}</dt>
              <dd className="m-0 flex flex-col">
                <span className="text-xs font-bold text-muted">21Go</span>
                <span className="font-semibold text-navy-900">{a}</span>
              </dd>
              <dd className="m-0 flex flex-col">
                <span className="text-xs font-bold text-muted">Seguro tradicional</span>
                <span className="text-muted">{b}</span>
              </dd>
            </dl>
          ))}
        </Revelar>
        <Revelar atraso={60} className="hidden max-w-[960px] overflow-x-auto rounded-2xl border border-line sm:block">
          <table className="w-full min-w-[560px] border-collapse text-base">
            <thead>
              <tr className="bg-surface-100 text-left">
                <th scope="col" className="px-5 py-4">
                  <span className="sr-only">Critério</span>
                </th>
                <th scope="col" className="px-5 py-4 font-extrabold text-navy-800">21Go</th>
                <th scope="col" className="px-5 py-4 font-bold text-muted">Seguro tradicional</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, a, b]) => (
                <tr key={k} className="border-t border-line">
                  <th scope="row" className="px-5 py-4 text-left font-semibold">{k}</th>
                  <td className="px-5 py-4 font-semibold">{a}</td>
                  <td className="px-5 py-4 text-muted">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Revelar>
        <p className="m-0 text-sm leading-relaxed text-muted">
          A 21Go é uma associação de proteção patrimonial por rateio (mutualismo). Não é seguro.
        </p>
      </div>
    </section>
  )
}

/** Quem é a 21Go (dados do Manual do Consultor 21Go, edição 2026). Sem SUSEP, por decisão do Clebson. */
export const CNPJ_21GO = '40.902.817/0001-70'

export function QuemE21Go() {
  return (
    <section aria-labelledby="quem-e-21go" className="px-6 py-14 sm:py-20">
      <Revelar className="mx-auto grid max-w-[1200px] items-start gap-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <h2 id="quem-e-21go" className="m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.8px] sm:text-[34px]">
            Quem é a 21Go
          </h2>
          <p className="m-0 text-lg leading-relaxed text-muted">
            A proteção é da 21Go Proteção Patrimonial Veicular, empresa do Rio de Janeiro com mais de 20 anos de
            mercado e sede própria, com oficina, em Campo Grande (RJ). A CITmax é consultor autorizado da 21Go: faz a
            sua cotação, o cadastro e o atendimento pelo WhatsApp.
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px] text-navy-800">
          <li className="flex items-start gap-2.5">
            <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
            Indenização em até 90 dias depois da documentação, como diz o contrato
          </li>
          <li className="flex items-start gap-2.5">
            <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
            Assistência 24h pelo 0800, em todo o Brasil
          </li>
          <li className="text-sm text-muted">21Go Proteção Patrimonial Veicular · CNPJ {CNPJ_21GO}</li>
        </ul>
      </Revelar>
    </section>
  )
}

/** Dúvidas que as regras de cima não respondem. Respostas pelo Manual do Consultor 21Go. */
const FAQS: [string, string][] = [
  ['Precisa de análise de perfil ou consulta ao SPC/Serasa?', 'Não. A 21Go não consulta crédito nem restringe por idade, estado civil, CEP ou por você trabalhar com aplicativo (Uber, 99). A proteção é para o veículo.'],
  ['Quem pode dirigir o meu carro?', 'Qualquer pessoa: é livre condutor, sem restrição de idade. Se o seu filho, a sua esposa ou um amigo bater, o veículo fica protegido do mesmo jeito.'],
  ['Atendem em todo o Brasil?', 'Sim. A cotação, a adesão e a vistoria são 100% online, e a assistência 24h e o guincho funcionam em todo o território nacional.'],
  ['Como funciona a assistência 24h e o guincho?', 'Uma central 0800 atende 24 horas por dia, 7 dias por semana, em todo o Brasil: guincho, socorro mecânico e elétrico, troca de pneus, chaveiro e hospedagem emergencial.'],
  ['O que é o desconto do adesivo 21Go?', 'Se você colocar o adesivo discreto da 21Go no vidro traseiro, ganha até 15% de desconto em todas as mensalidades. Vale para carro (moto, elétrico e híbrido não têm).'],
]

export function Faq() {
  const [open, setOpen] = useState<string | null>(FAQS[0][0])
  return (
    <section id="duvidas" className="scroll-mt-20 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <Revelar className="flex max-w-[640px] flex-col gap-3">
          <h2 className={h2}>Outras dúvidas</h2>
        </Revelar>
        <Revelar atraso={60} className="flex max-w-[800px] flex-col gap-3">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === q
            return (
              <div key={q} className="rounded-xl border border-line bg-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : q)}
                  className="flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-[17px] font-semibold text-navy-800"
                >
                  <span>{q}</span>
                  <ChevronDown
                    aria-hidden
                    className={`h-5 w-5 shrink-0 text-navy-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {/* A resposta fica sempre no HTML (o Google e as IAs leem); fechada, só não aparece. */}
                <p id={`faq-${i}`} hidden={!isOpen} className="m-0 px-5 pb-5 leading-relaxed text-muted">
                  {a}
                </p>
              </div>
            )
          })}
        </Revelar>
      </div>
    </section>
  )
}

export function CtaFinal() {
  return (
    <section className="bg-navy-900 bg-[radial-gradient(ellipse_at_100%_0%,rgba(242,145,29,0.22),transparent_50%)] px-6 py-14 text-white sm:py-24">
      <Revelar className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-3">
          <h2 className="m-0 text-[32px] font-extrabold leading-[1.1] tracking-[-1px] sm:text-[40px]">
            Descubra quanto custa proteger seu veículo.
          </h2>
          <p className="m-0 text-lg text-muted-soft">Cotação grátis em 30 segundos, de qualquer lugar do Brasil.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="#cotacao"
            className="inline-flex min-h-[54px] items-center rounded-lg bg-go-orange px-7 text-[17px] font-extrabold text-navy-950 no-underline transition hover:-translate-y-px hover:shadow-cta active:scale-[0.98]"
          >
            Cotar agora
          </a>
          <a
            href={whatsappUrl()}
            className="inline-flex min-h-[54px] items-center gap-2 rounded-lg border border-navy-500 px-6 text-[17px] font-bold text-white no-underline"
          >
            Falar no WhatsApp
          </a>
        </div>
      </Revelar>
    </section>
  )
}
