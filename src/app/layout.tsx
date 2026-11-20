import type { Metadata, Viewport } from 'next'
import './globals.css'

const title = '21Go Proteção Veicular — Cotação Instantânea Oficial'
const description =
  'Simule a proteção do seu veículo em segundos com valores oficiais da 21Go. Atendimento direto e exclusivo da nossa franquia.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website', locale: 'pt_BR', siteName: '21Go Proteção Veicular' },
}

export const viewport: Viewport = {
  themeColor: '#F5600A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
