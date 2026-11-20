import type { Metadata } from 'next'
import './globals.css'

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
      <body className="antialiased">{children}</body>
    </html>
  )
}
