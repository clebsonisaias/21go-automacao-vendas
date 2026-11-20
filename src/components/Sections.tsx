import { MessageCircle } from 'lucide-react'
import { Logo } from './Plate'

const PASSOS = [
  {
    t: 'Digite a placa',
    d: 'Veja na hora os planos e os valores para o seu veículo.',
  },
  {
    t: 'Escolha o plano',
    d: 'Compare as coberturas e aplique os descontos de adesivo e de pontualidade.',
  },
  {
    t: 'Faça a vistoria pelo celular',
    d: 'Tire as fotos do veículo em casa, sem fila. A aprovação é rápida.',
  },
  {
    t: 'Pronto, você está protegido',
    d: 'Com a vistoria aprovada e a taxa de ativação paga, a proteção começa no mesmo dia.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-titulo" className="scroll-mt-4 bg-tinta px-5 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 id="como-titulo" className="max-w-2xl font-display text-[clamp(2.2rem,5vw,3.8rem)] font-bold leading-none">
          Do orçamento à proteção em quatro passos
        </h2>
        <ol className="passos mt-14 grid gap-10 md:grid-cols-4 md:gap-8">
          {PASSOS.map((p, i) => (
            <li key={p.t} className="grid grid-cols-[3.2rem_1fr] gap-x-4 md:block">
              <span
                className="relative z-10 flex h-[3.4rem] w-[3.4rem] items-center justify-center rounded-full bg-cone font-display text-3xl font-extrabold leading-none text-tinta"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="md:mt-5">
                <h3 className="font-display text-2xl font-bold leading-tight">{p.t}</h3>
                <p className="mt-2 max-w-[18rem] text-base leading-relaxed text-white/85">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const COBERTURAS = [
  {
    t: 'Roubo, furto ou colisão',
    d: 'Indenização de 100% da Tabela FIPE em caso de roubo, furto, colisão e perda total.',
  },
  {
    t: 'Carro parado na rua',
    d: 'Guincho em todo o Brasil, socorro mecânico e elétrico, recarga de bateria, chaveiro e troca de pneus, a qualquer hora.',
  },
  {
    t: 'Dano ao carro de outra pessoa',
    d: 'Cobertura de prejuízos causados a veículos de terceiros, de até R$ 100.000.',
  },
  {
    t: 'Carro na oficina',
    d: 'Carro reserva de 7 a 15 dias enquanto o seu é reparado em oficina credenciada.',
  },
  {
    t: 'Alagamento, granizo ou árvore na pista',
    d: 'Proteção contra enchentes, alagamentos, queda de árvores e chuva de granizo.',
  },
  {
    t: 'Quem pode dirigir',
    d: 'Qualquer pessoa habilitada pode dirigir sem afetar a indenização. Motoristas de aplicativo e carros de trabalho são aceitos.',
  },
]

export function Coverage() {
  return (
    <section id="coberturas" aria-labelledby="cob-titulo" className="scroll-mt-4 px-5 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[21rem_1fr] lg:gap-16">
        <div>
          <h2 id="cob-titulo" className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-bold leading-none lg:sticky lg:top-8">
            O que a 21Go faz por você quando acontece
          </h2>
          <p className="mt-5 max-w-sm text-base text-tinta/80">
            Cada plano inclui coberturas diferentes. A lista completa aparece na sua cotação.
          </p>
        </div>
        <dl>
          {COBERTURAS.map((c) => (
            <div key={c.t} className="grid gap-1 border-t-2 border-tinta py-6 sm:grid-cols-[15rem_1fr] sm:gap-8 first:border-t-0 first:pt-0 sm:first:border-t-2 sm:first:pt-6 lg:first:border-t-0 lg:first:pt-0">
              <dt className="font-display text-[1.7rem] font-bold leading-tight">{c.t}</dt>
              <dd className="max-w-xl text-lg leading-relaxed">{c.d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

const FAQS = [
  {
    q: 'Precisa de análise de perfil ou consulta ao SPC/Serasa?',
    a: 'Não. Na 21Go não fazemos consulta de crédito nem restrição por idade, estado civil, CEP de residência ou por trabalhar com aplicativo (Uber, 99). A proteção é para o veículo.',
  },
  {
    q: 'Quanto tempo leva para meu veículo ficar protegido?',
    a: 'Depois da aprovação da vistoria, feita 100% online com fotos pelo celular, e da confirmação da taxa de ativação, a proteção entra em vigor no mesmo dia.',
  },
  {
    q: 'O que é o desconto do adesivo 21Go?',
    a: 'Se você colocar o adesivo discreto da 21Go no vidro traseiro, ganha até 15% de desconto em todas as mensalidades. O desconto vale enquanto o adesivo estiver no veículo.',
  },
  {
    q: 'Como funcionam a assistência 24h e o guincho?',
    a: 'A central 0800 atende 24 horas por dia, 7 dias por semana, em todo o Brasil. Ela aciona reboque e guincho, socorro mecânico, socorro elétrico, troca de pneus, chaveiro e hospedagem emergencial.',
  },
  {
    q: 'Como pago as mensalidades?',
    a: 'Por boleto bancário ou Pix. Quem paga até o dia do vencimento (dia 10 ou 20) tem 5% de desconto de pontualidade.',
  },
]

export function Faq({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section id="duvidas" aria-labelledby="faq-titulo" className="scroll-mt-4 bg-white px-5 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[21rem_1fr] lg:gap-16">
        <div>
          <h2 id="faq-titulo" className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-bold leading-none">
            Dúvidas frequentes
          </h2>
          <p className="mt-5 text-base text-tinta/80">Não achou a sua pergunta?</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 font-bold underline underline-offset-4"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Pergunte a um consultor no WhatsApp
          </a>
        </div>
        <div className="border-b-2 border-tinta">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-t-2 border-tinta">
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 font-display text-[1.6rem] font-bold leading-tight">
                {f.q}
                <span
                  className="relative h-5 w-5 shrink-0 before:absolute before:left-0 before:top-1/2 before:h-[3px] before:w-full before:-translate-y-1/2 before:bg-tinta after:absolute after:left-1/2 after:top-0 after:h-full after:w-[3px] after:-translate-x-1/2 after:bg-tinta group-open:after:hidden"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-2xl pb-6 text-lg leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="bg-tinta px-5 py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <Logo onDark />
          <p className="mt-4 text-base text-white/85">
            Atendimento e cotação online para o estado do Rio de Janeiro.
          </p>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/75">
          As cotações refletem os valores oficiais sincronizados com o motor PowerCRM. Proteção patrimonial veicular
          operada em regime associativo, conforme o artigo 5º da Constituição Federal.
        </p>
      </div>
    </footer>
  )
}
