import type { Metadata } from 'next'
import { Logo, SiteFooter } from '@/components/home/SiteChrome'
import { SITE, whatsappUrl } from '@/lib/site'

// Padrão de página: rota de marketing "Blog post" (navegação → coluna de leitura de 65–75ch → rodapé). Política de privacidade do
// site da CITmax, consultor autorizado da 21Go. Só o que o site faz de fato (conferido no código).

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'Que dados o site da CITmax, consultor autorizado da 21Go, usa, para quê, com quem compartilha e por quanto tempo guarda.',
  alternates: { canonical: '/privacidade' },
}

const ATUALIZADA = '25 de novembro de 2026'

const h2 = 'm-0 mt-10 text-xl font-extrabold tracking-[-0.3px] text-navy-900'
const p = 'm-0 mt-3 leading-relaxed text-navy-800'
const li = 'leading-relaxed text-navy-800'

export default function PrivacidadePage() {
  const telefone = SITE.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
          <Logo href="/" size={48} />
          <a href="/#cotacao" className="inline-flex min-h-[44px] items-center rounded-lg bg-go-orange px-4 text-sm font-extrabold text-navy-950">
            Cotar pela placa
          </a>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-[calc(70ch+3rem)] px-6 py-12 sm:py-16">
        <p className="m-0 text-xs font-bold tracking-[1.5px] text-navy-600">PRIVACIDADE</p>
        <h1 className="m-0 mt-2 text-[32px] font-extrabold leading-tight tracking-[-1px] text-navy-900 sm:text-[40px]">
          Como o site usa os seus dados
        </h1>
        <p className="m-0 mt-3 text-sm text-muted">Atualizada em {ATUALIZADA}.</p>

        <p className={p}>
          Este site é da CITmax, consultor autorizado da 21Go Proteção Veicular
          {SITE.cnpj ? ` (CNPJ ${SITE.cnpj})` : ''}. A CITmax é a responsável pelos dados que você informa aqui. A
          proteção, os planos e o regulamento são da 21Go, que recebe os dados do seu cadastro para fazer a adesão.
        </p>

        <h2 className={h2}>O que usamos e para quê</h2>
        <ul className="m-0 mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={li}>
            <strong>Cotação pela placa:</strong> a placa, o estado e os dados do veículo, para buscar o modelo na
            Tabela FIPE e calcular o preço. A cotação sozinha não guarda nada sobre você.
          </li>
          <li className={li}>
            <strong>Receber a cotação no WhatsApp:</strong> o número que você digitar, o veículo e os valores da
            cotação, para mandar a cotação, o link para voltar a ela, até 2 lembretes e, se for o caso, uma mensagem da
            nossa equipe sobre ela. Esse pedido fica guardado por 90 dias. Os lembretes param quando você se cadastra ou
            quando avisa a gente que não quer mais.
          </li>
          <li className={li}>
            <strong>Cadastro da adesão:</strong> nome, WhatsApp, e-mail, CPF, cidade, os documentos (CNH ou RG,
            documento do veículo e comprovante de residência) e as fotos da vistoria, para fazer a sua adesão na
            21Go, conferir a região do preço e gerar o Pix da taxa de adesão.
          </li>
          <li className={li}>
            <strong>Chat do site:</strong> as mensagens que você escreve, para a assistente responder. Não escreva
            CPF nem outros documentos no chat.
          </li>
          <li className={li}>
            <strong>Localização:</strong> se você permitir, o navegador usa a localização só para sugerir o seu
            estado na cotação. Ela não é enviada ao site.
          </li>
        </ul>

        <h2 className={h2}>Com quem compartilhamos</h2>
        <ul className="m-0 mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={li}>
            <strong>21Go Proteção Veicular</strong> e os sistemas dela (PowerCRM, CRM 21Go, App Visto e Hinova SGA):
            cotação, cadastro, vistoria e mensalidades.
          </li>
          <li className={li}>
            <strong>Mercado Pago:</strong> o Pix da taxa de adesão.
          </li>
          <li className={li}>
            <strong>CITchat/AtendeHub e WhatsApp (Meta):</strong> as mensagens do WhatsApp, inclusive a cotação
            pedida no site.
          </li>
          <li className={li}>
            <strong>OpenAI:</strong> a leitura automática dos documentos enviados e as respostas do chat do site. A
            reserva do chat (OpenRouter) não recebe documentos.
          </li>
          <li className={li}>
            <strong>Telegram:</strong> o grupo da equipe da CITmax recebe um aviso a cada cadastro novo (com nome,
            WhatsApp, e-mail, CPF, cidade e veículo) e sobre etapas paradas, para o atendimento.
          </li>
        </ul>
        <p className={p}>Não vendemos os seus dados e não usamos os seus dados para anúncios de outras empresas.</p>

        <h2 className={h2}>Por quanto tempo guardamos</h2>
        <ul className="m-0 mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={li}>Cotação pedida no WhatsApp: 90 dias.</li>
          <li className={li}>
            Cadastro e documentos: enquanto durar a sua adesão e pelos prazos que a lei exige depois dela. Cadastro que
            não virou adesão: até você pedir para apagar.
          </li>
          <li className={li}>Conversas do chat do site: não ficam guardadas no site.</li>
        </ul>

        <h2 className={h2}>O que fica no seu navegador</h2>
        <p className={p}>
          O site guarda no seu próprio aparelho, sem enviar a ninguém: de onde você chegou ao site (por 30 dias, para
          sabermos que anúncio ou indicação trouxe você), o cupom que veio num link (por 30 dias) e o estado escolhido
          na cotação. Na área do associado, guarda também o acesso e os seus dados de associado, para não pedir o
          login a cada visita; ao tocar em Sair, eles são apagados do aparelho.
        </p>

        <h2 className={h2}>Seus direitos</h2>
        <p className={p}>
          Pela Lei Geral de Proteção de Dados (LGPD, art. 18), você pode pedir para saber quais dados temos, corrigir,
          apagar o que não for mais necessário, saber com quem compartilhamos e parar de receber mensagens. Para isso,
          fale com o nosso canal de atendimento sobre dados pessoais:
        </p>
        <ul className="m-0 mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={li}>
            WhatsApp:{' '}
            <a href={whatsappUrl('Quero falar sobre os meus dados (privacidade).')} className="font-semibold text-navy-600 underline">
              {telefone}
            </a>
          </li>
          {SITE.email && (
            <li className={li}>
              E-mail:{' '}
              <a href={`mailto:${SITE.email}`} className="font-semibold text-navy-600 underline">
                {SITE.email}
              </a>
            </li>
          )}
        </ul>
        <p className={p}>Para não receber mais lembretes da cotação, avise a gente pelo WhatsApp e a equipe tira o seu número.</p>
      </main>

      <SiteFooter />
    </>
  )
}
