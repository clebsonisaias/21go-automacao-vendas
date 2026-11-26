'use client'

import { useState } from 'react'
import { Revelar } from '@/components/common/Revelar'
import {
  Check,
  ChevronDown,
  CloudRain,
  Car,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { whatsappUrl } from '@/lib/site'

const eyebrow = 'text-xs font-bold tracking-[1.5px] text-navy-600'
const h2 = 'm-0 text-[32px] font-extrabold leading-[1.1] tracking-[-1.2px] sm:text-[44px]'

export function Stats() {
  const items = [
    ['20+ anos', 'de mercado, desde 2004'],
    ['100% FIPE', 'em roubo, furto e perda total'],
    ['48h', 'para aprovar a sua adesão'],
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
    icon: Users,
    title: 'Sem análise de perfil',
    text: 'Qualquer condutor habilitado pode dirigir sem afetar a indenização. Motoristas de aplicativo são bem-vindos.',
  },
]

export function Coberturas() {
  return (
    <section id="coberturas" className="scroll-mt-20 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <Revelar className="flex max-w-[680px] flex-col gap-3">
          <span className={eyebrow}>O QUE ESTÁ PROTEGIDO</span>
          <h2 className={h2}>Proteção completa, sem letras miúdas</h2>
          <p className="m-0 text-lg leading-relaxed text-muted">
            Tudo o que você precisa para rodar tranquilo, da garagem à estrada, em qualquer canto do Brasil.
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
          <span className={eyebrow}>PLANOS</span>
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
                  <span className="self-start rounded-full bg-go-orange px-3 py-1 text-xs font-extrabold tracking-wider text-navy-950">
                    MAIS ESCOLHIDO
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
    ['04', 'Adesão no Pix e pronto', 'Com a vistoria aprovada, você paga a adesão por Pix: roubo e furto ficam protegidos na hora, e o resto em 72 horas úteis.', true],
  ] as const
  return (
    <section id="como-funciona" className="scroll-mt-20 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <Revelar className="flex max-w-[640px] flex-col gap-3">
          <span className={eyebrow}>COMO FUNCIONA</span>
          <h2 className={h2}>Protegido em 4 passos, sem sair de casa</h2>
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

export function Comparativo() {
  const rows = [
    ['Como funciona', 'Os associados dividem entre si o custo dos imprevistos', 'A seguradora vende uma apólice e assume o risco'],
    ['Quem pode dirigir', 'Livre condutor, sem restrição de idade', 'Geralmente depende do perfil do motorista'],
    ['Carro de aplicativo', 'Aceita, sem mudar valor nem indenização', 'Costuma encarecer ou recusar'],
    ['Fidelidade', 'Sem fidelidade e sem multa de cancelamento', 'Contrato anual'],
    ['Indenização', '100% da Tabela FIPE', 'Varia conforme a apólice'],
  ]
  return (
    <section className="border-y border-line bg-white px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[960px] flex-col gap-10">
        <Revelar className="flex flex-col items-center gap-3 text-center">
          <span className={eyebrow}>COMPARATIVO</span>
          <h2 className={h2}>Proteção veicular x seguro tradicional</h2>
        </Revelar>
        <Revelar atraso={60} className="overflow-x-auto rounded-2xl border border-line">
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
        <p className="m-0 text-center text-sm leading-relaxed text-muted">
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
          <span className={eyebrow}>QUEM É A 21GO</span>
          <h2 id="quem-e-21go" className="m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.8px] sm:text-[34px]">
            Mais de 20 anos protegendo quem trabalha
          </h2>
          <p className="m-0 text-lg leading-relaxed text-muted">
            A proteção é da 21Go Proteção Patrimonial Veicular, empresa do Rio de Janeiro com sede própria, com oficina, em
            Campo Grande (RJ). A CITmax é consultor autorizado da 21Go: faz a sua cotação, o cadastro e o atendimento pelo
            WhatsApp.
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px] text-navy-800">
          <li className="flex items-start gap-2.5">
            <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
            Sem fidelidade e sem multa de cancelamento
          </li>
          <li className="flex items-start gap-2.5">
            <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go-orange-dark" />
            Contrato (termo de adesão) por e-mail, com prazo para ler e desistir
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

export function SeguradoraDisseNao() {
  const items = [
    'Nome negativado',
    'Motorista de aplicativo',
    'Carros mais antigos (de 2006 em diante)',
    'Carros de leilão (80% da FIPE)',
    'Carro financiado ou em nome de outra pessoa',
    'Motos até 1.000 cc',
  ]
  return (
    <section className="px-6 py-14 sm:py-24">
      <Revelar className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-10 rounded-3xl bg-navy-950 px-5 py-8 text-white sm:px-12 sm:py-14">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <span className="text-xs font-bold tracking-[1.5px] text-go-orange">A SEGURADORA DISSE NÃO?</span>
          <h2 className="m-0 text-[32px] font-extrabold leading-[1.1] tracking-[-1px] sm:text-[40px]">
            Na 21Go, você tem proteção.
          </h2>
          <p className="m-0 text-lg leading-relaxed text-muted-soft">
            Aceitamos quem as seguradoras costumam recusar — em qualquer estado do país.
          </p>
        </div>
        <ul className="m-0 grid min-w-0 flex-[1_1_420px] list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]">
          {items.map((t) => (
            <li key={t} className="rounded-xl border border-navy-line bg-navy-900 px-5 py-4 font-semibold">
              {t}
            </li>
          ))}
        </ul>
      </Revelar>
    </section>
  )
}

const FAQS = [
  ['Precisa de análise de perfil ou consulta ao SPC/Serasa?', 'Não. A 21Go não consulta crédito nem restringe por idade, estado civil, CEP ou por você trabalhar com aplicativo (Uber, 99). A proteção é para o veículo.'],
  ['Quanto tempo leva para meu veículo ficar protegido?', 'Você envia os documentos pelo site e faz a vistoria do veículo no App Visto, pelo link que enviamos no WhatsApp. Com a vistoria aprovada, você paga a adesão por Pix: roubo e furto ficam protegidos na hora, e reboque, assistência 24h, colisão e fenômenos da natureza liberam em 72 horas úteis. Não existe carência de 90 dias.'],
  ['Atendem em todo o Brasil?', 'Sim. A cotação, a adesão e a vistoria são 100% online, e a assistência 24h e o guincho funcionam em todo o território nacional.'],
  ['O que é o desconto do adesivo 21Go?', 'Se você colocar o adesivo discreto da 21Go no vidro traseiro, ganha até 15% de desconto em todas as mensalidades.'],
  ['Como funciona a assistência 24h e o guincho?', 'Uma central 0800 atende 24 horas por dia, 7 dias por semana, em todo o Brasil: guincho, socorro mecânico e elétrico, troca de pneus, chaveiro e hospedagem emergencial.'],
  ['Como é feito o pagamento das mensalidades?', 'Por boleto, Pix ou cartão cadastrado no aplicativo da 21Go. A primeira mensalidade vem no mês seguinte à ativação, com vencimento no dia 10 ou no dia 20. Pagando até 5 dias antes do vencimento, você tem 5% de desconto.'],
  ['Se eu bater o carro, quanto eu pago?', 'Só a cota de participação, uma parte do valor da FIPE: 6% para carro, 10% para elétrico e híbrido e 15% para moto. A 21Go paga o resto direto à oficina. Roubo, furto e perda total não têm cota.'],
  ['Quem pode dirigir o meu carro?', 'Qualquer pessoa: é livre condutor, sem restrição de idade. Se o seu filho, a sua esposa ou um amigo bater, o veículo fica protegido do mesmo jeito.'],
  ['Posso cancelar quando quiser?', 'Pode. Não tem fidelidade nem multa: é só avisar 10 dias antes do vencimento do boleto.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="duvidas" className="scroll-mt-20 px-6 py-14 sm:py-24">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8">
        <Revelar className="flex flex-col items-center gap-3 text-center">
          <span className={eyebrow}>DÚVIDAS FREQUENTES</span>
          <h2 className={h2}>Perguntas frequentes</h2>
        </Revelar>
        <Revelar atraso={60} className="flex flex-col gap-3">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className="rounded-xl border border-line bg-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
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
