import type { Metadata } from 'next'
import './globals.css'
import { LunaFloatingChat } from '@/components/common/LunaFloatingChat'

export const metadata: Metadata = {
  title: '21Go Proteção Veicular · CITmax, franquia autorizada',
  description:
    'Cotação da proteção veicular da 21Go pela placa, com os valores oficiais. Atendimento da CITmax, franquia autorizada da 21Go.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Liga as animações de rolagem; se o React não subir em 4 s, mostra tudo (components/common/Revelar.tsx). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('anima');setTimeout(function(){if(!document.documentElement.dataset.revelar)document.documentElement.classList.remove('anima')},4000)",
          }}
        />
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
