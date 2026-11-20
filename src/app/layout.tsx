import type { Metadata } from 'next'
import './globals.css'
import { LunaFloatingChat } from '@/components/common/LunaFloatingChat'

export const metadata: Metadata = {
  title: '21Go Proteção Veicular — Cotação Instantânea Oficial',
  description:
    'Simule a proteção do seu veículo em segundos com valores oficiais da 21Go. Atendimento direto e exclusivo da nossa franquia.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <LunaFloatingChat />
      </body>
    </html>
  )
}
