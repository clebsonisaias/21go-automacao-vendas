'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SimboloLogo } from '@/components/Marca'
import { Bot, Calculator, Camera, FileText, LogOut, MapPin, Menu, MessageSquareText, TicketPercent, Users, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LeadsView } from '@/components/admin/LeadsView'
import { InstagramPanel } from '@/components/admin/InstagramPanel'
import { CuponsPanel } from '@/components/admin/CuponsPanel'
import { CarteiraPanel } from '@/components/admin/CarteiraPanel'
import { TabelaNordestePanel } from '@/components/admin/TabelaNordestePanel'
import { Tooltip } from '@/components/admin/Tooltip'
import { LucroSimulator } from '@/components/admin/LucroSimulator'
import { HinovaBoletos } from '@/components/admin/HinovaBoletos'
import { ScriptsGo } from '@/components/admin/ScriptsGo'
import { LunaAssistant } from '@/components/admin/LunaAssistant'

type Tab = 'cadastros' | 'carteira' | 'cupons' | 'nordeste' | 'instagram' | 'lucro' | 'hinova' | 'scripts' | 'luna'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'cadastros', label: 'Cadastros', icon: Users },
  { id: 'carteira', label: 'Carteira', icon: Wallet },
  { id: 'cupons', label: 'Cupons', icon: TicketPercent },
  { id: 'nordeste', label: 'Tabela regional', icon: MapPin },
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'lucro', label: 'Simulador de lucro', icon: Calculator },
  { id: 'hinova', label: 'Consulta Hinova', icon: FileText },
  { id: 'scripts', label: 'Scripts', icon: MessageSquareText },
  { id: 'luna', label: 'IA Luna', icon: Bot },
]

const isTab = (v: string): v is Tab => TABS.some((t) => t.id === v)

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('cadastros')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  // A aba fica no endereço (#scripts etc.): atualizar a página não perde o lugar.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1)
      if (isTab(h)) setTab(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const go = (t: Tab) => {
    setTab(t)
    setMenuOpen(false)
    history.replaceState(null, '', t === 'cadastros' ? window.location.pathname : `#${t}`)
  }

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      window.location.href = '/admin/login'
    }
  }

  const current = TABS.find((t) => t.id === tab)!

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-40 w-full border-b border-navy-line bg-navy-950">
        <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <SimboloLogo lado={36} priority />
            <span className="text-sm font-semibold text-white">Painel da franquia</span>
          </div>

          {/* Navegação: abas a partir de 1280 px (com ícones só nas telas bem largas); abaixo disso, o menu */}
          <nav aria-label="Seções do painel" className="hidden flex-1 xl:block">
            <ul className="m-0 flex list-none items-center gap-1 p-0">
              {TABS.map((t) => {
                const active = t.id === tab
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => go(t.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
                        active ? 'bg-navy-800 text-white' : 'text-muted-soft hover:bg-navy-900 hover:text-white'
                      }`}
                    >
                      <t.icon aria-hidden className={`hidden h-4 w-4 2xl:block ${active ? 'text-go-orange' : ''}`} />
                      {t.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-0">
            {/* Navegação recolhida no celular */}
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="admin-menu"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-medium text-white hover:bg-navy-900 xl:hidden"
            >
              {menuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
              {current.label}
            </button>
            <Tooltip label="Sair do painel">
              <button
                type="button"
                onClick={logout}
                aria-label="Sair do painel"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-soft transition-colors hover:bg-navy-900 hover:text-white"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {menuOpen && (
          <nav id="admin-menu" aria-label="Seções do painel" className="border-t border-navy-line px-4 pb-3 pt-2 xl:hidden">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => go(t.id)}
                    aria-current={t.id === tab ? 'page' : undefined}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium ${
                      t.id === tab ? 'bg-navy-800 text-white' : 'text-muted-soft hover:bg-navy-900 hover:text-white'
                    }`}
                  >
                    <t.icon aria-hidden className="h-4 w-4" />
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main className="admin-light mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {tab === 'cadastros' && <LeadsView />}
        {tab === 'carteira' && <CarteiraPanel />}
        {tab === 'cupons' && <CuponsPanel />}
        {tab === 'nordeste' && <TabelaNordestePanel />}
        {tab === 'instagram' && <InstagramPanel />}
        {tab === 'lucro' && <LucroSimulator />}
        {tab === 'hinova' && <HinovaBoletos />}
        {tab === 'scripts' && <ScriptsGo />}
        {tab === 'luna' && <LunaAssistant />}
      </main>
    </div>
  )
}
