import { MessageCircle } from 'lucide-react'
import { SITE, whatsappUrl } from '@/lib/site'
import { LogoCompleto, SimboloLogo } from '@/components/Marca'

export function Logo({
  size = 60,
  showText = true,
  href = '#topo',
  subtitle = 'FRANQUIA AUTORIZADA',
  imgClassName = '',
}: {
  size?: number
  showText?: boolean
  href?: string
  subtitle?: string
  /** Classes da imagem do logo (ex.: menor no celular). */
  imgClassName?: string
}) {
  // O logo já traz "21 Go! Proteção Veicular"; sem texto, só o símbolo.
  return (
    <a href={href} className="flex items-center gap-3 no-underline">
      {showText ? (
        <>
          <LogoCompleto altura={size} priority className={imgClassName} />
          <span className="hidden border-l border-white/20 pl-3 text-xs font-semibold leading-tight tracking-[1.5px] text-go-lime sm:block">
            {subtitle}
          </span>
        </>
      ) : (
        <SimboloLogo lado={size} priority alt="21Go Proteção Veicular" />
      )}
    </a>
  )
}

export function TopBar() {
  return (
    <div className="hidden bg-navy-deep text-[13px] text-muted-dark sm:block">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-2">
        <span>Franquia autorizada 21Go · Atendimento para todo o Brasil</span>
        <span className="flex flex-wrap gap-x-4">
          <span>Mais de 20 anos de mercado</span>
        </span>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const links = [
    ['#coberturas', 'Coberturas'],
    ['#planos', 'Planos'],
    ['#como-funciona', 'Como funciona'],
    ['#duvidas', 'Dúvidas'],
  ]
  return (
    <header className="sticky top-0 z-30 border-b border-navy-line bg-navy-950">
      <div className="mx-auto flex max-w-[1200px] flex-nowrap items-center justify-between gap-3 px-4 py-2.5 sm:flex-wrap sm:gap-4 sm:px-6 sm:py-3">
        <Logo imgClassName="h-11 w-auto sm:h-[60px]" />
        <nav aria-label="Principal" className="hidden gap-7 text-[15px] font-medium md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="text-line no-underline transition hover:text-go-orange">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <a
            href={whatsappUrl()}
            aria-label="Falar no WhatsApp"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-navy-500 px-3 text-[15px] font-semibold text-white no-underline sm:px-4"
          >
            <MessageCircle aria-hidden className="h-[18px] w-[18px] text-go-whatsapp" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <a
            href="#cotacao"
            className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg bg-go-orange px-4 text-[15px] font-bold text-navy-950 no-underline transition hover:-translate-y-px hover:shadow-cta active:scale-[0.98] sm:px-5"
          >
            Cotar agora
          </a>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  const nav = [
    ['#coberturas', 'Coberturas'],
    ['#planos', 'Planos'],
    ['#como-funciona', 'Como funciona'],
    ['#duvidas', 'Dúvidas'],
    ['/carteirinha', 'Carteirinha Digital'],
    ['/admin', 'Painel da Franquia'],
  ]
  return (
    <footer className="bg-navy-deep px-6 pb-28 pt-14 text-muted-dark sm:pb-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-wrap justify-between gap-8">
          <div className="flex flex-col gap-2">
            <LogoCompleto altura={56} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">
                Franquia autorizada{SITE.nome ? ` · ${SITE.nome}` : ''}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-12 text-[15px]">
            <div className="flex flex-col gap-2">
              <span className="font-bold text-white">Navegação</span>
              {nav.map(([href, label]) => (
                <a key={href} href={href} className="text-muted-dark no-underline hover:text-white">
                  {label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-white">Atendimento</span>
              {SITE.whatsapp && <span>WhatsApp: {SITE.whatsapp}</span>}
              {SITE.email && <span>E-mail: {SITE.email}</span>}
              {SITE.horario && <span>{SITE.horario}</span>}
            </div>
          </div>
        </div>
        <p className="border-t border-navy-800 pt-6 text-[13px] leading-relaxed text-muted-2">
          Proteção patrimonial veicular operada em regime associativo (mutualismo). Não se trata de seguro.
          As cotações refletem os valores oficiais sincronizados com o motor PowerCRM; valores e coberturas
          variam conforme o plano, o modelo e o ano do veículo.
          {SITE.cnpj ? ` CNPJ da franquia: ${SITE.cnpj}.` : ''}
        </p>
      </div>
    </footer>
  )
}

export function FloatingWhatsApp() {
  return (
    <a
      href={whatsappUrl()}
      aria-label="Falar no WhatsApp"
      className="fixed bottom-4 right-4 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-go-whatsapp shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:bottom-5 sm:right-5 sm:h-[60px] sm:w-[60px]"
    >
      <MessageCircle aria-hidden className="h-[26px] w-[26px] text-white sm:h-[30px] sm:w-[30px]" />
    </a>
  )
}
