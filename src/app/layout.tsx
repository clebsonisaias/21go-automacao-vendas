import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LunaFloatingChat } from '@/components/common/LunaFloatingChat'
import { SITE } from '@/lib/site'

// Inter servida pelo próprio site (o next/font baixa na build): sem folha de estilo externa
// bloqueando a primeira pintura.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-inter' })

const URL_SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br').replace(/\/+$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: '21Go Proteção Veicular · CITmax, consultor autorizado',
    template: '%s · 21Go pela CITmax',
  },
  description:
    'Cotação da proteção veicular da 21Go pela placa, com os valores oficiais. Atendimento da CITmax, consultor autorizado da 21Go.',
  applicationName: '21Go Proteção Veicular · CITmax',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: '21Go Proteção Veicular · CITmax',
    url: '/',
    title: '21Go Proteção Veicular: cotação pela placa',
    description: '100% da Tabela FIPE, sem consulta ao SPC/Serasa e vistoria pelo celular. CITmax, consultor autorizado da 21Go.',
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
}

/**
 * Dados estruturados (schema.org): quem é a CITmax e o serviço. Sem endereço (atendimento online)
 * e sem nota ou avaliação (não há avaliações publicadas). Proteção veicular não é seguro: nada de
 * tipos de seguradora.
 */
function dadosEstruturados() {
  const fone = SITE.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55-$1-$2-$3')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${URL_SITE}/#citmax`,
        name: 'CITmax',
        alternateName: '21Go Proteção Veicular · CITmax',
        description: 'Consultor autorizado da 21Go Proteção Veicular.',
        url: `${URL_SITE}/`,
        logo: `${URL_SITE}/brand/logo-21go-consultor.png`,
        contactPoint: { '@type': 'ContactPoint', telephone: fone, contactType: 'sales', availableLanguage: 'Portuguese' },
        sameAs: ['https://www.instagram.com/citmax.21go'],
      },
      {
        '@type': 'Service',
        '@id': `${URL_SITE}/#protecao-veicular`,
        serviceType: 'Proteção veicular',
        name: 'Proteção veicular 21Go para carro e moto',
        provider: { '@id': `${URL_SITE}/#citmax` },
        brand: { '@type': 'Brand', name: '21Go Proteção Veicular' },
        areaServed: { '@type': 'Country', name: 'Brasil' },
        url: `${URL_SITE}/`,
      },
      {
        '@type': 'WebSite',
        '@id': `${URL_SITE}/#site`,
        url: `${URL_SITE}/`,
        name: '21Go Proteção Veicular · CITmax',
        inLanguage: 'pt-BR',
        publisher: { '@id': `${URL_SITE}/#citmax` },
      },
    ],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        {/* Liga as animações de rolagem; se o React não subir em 4 s, mostra tudo (components/common/Revelar.tsx). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('anima');setTimeout(function(){if(!document.documentElement.dataset.revelar)document.documentElement.classList.remove('anima')},4000)",
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados()).replace(/</g, '\\u003c') }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        <LunaFloatingChat />
      </body>
    </html>
  )
}
