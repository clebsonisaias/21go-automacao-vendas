'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'

/** Só aparece depois do hero, para não cobrir o botão principal da cotação. */
export function WhatsAppFloat({ href }: { href: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com um consultor no WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full bg-verde p-4 font-display text-xl font-bold text-white shadow-[4px_4px_0_#0E1A3B] transition-colors hover:bg-verde-dark md:px-6 md:py-3"
    >
      <MessageCircle className="h-7 w-7 md:h-6 md:w-6" aria-hidden="true" />
      <span className="hidden md:inline">Falar com um consultor</span>
    </a>
  )
}
