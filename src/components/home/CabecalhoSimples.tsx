import { Logo } from '@/components/home/SiteChrome'

/** Cabeçalho das páginas fora da home (privacidade, cidades): logo que volta ao início e o atalho da cotação. */
export function CabecalhoSimples() {
  return (
    <header className="border-b border-navy-line bg-navy-950">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
        <Logo href="/" size={48} />
        <a
          href="/#cotacao"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-go-orange px-4 text-sm font-extrabold text-navy-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Cotar pela placa
        </a>
      </div>
    </header>
  )
}
