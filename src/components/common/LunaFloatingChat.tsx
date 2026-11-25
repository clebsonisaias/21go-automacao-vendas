'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Sparkles, MessageCircle, ChevronDown, ShieldCheck } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function LunaFloatingChat() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  // No celular, na home, fica acima do botão do WhatsApp; nas outras páginas, embaixo.
  const naHome = pathname === '/'
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Olá! 👋 Sou a Luna, inteligência artificial da 21Go Proteção Veicular (CITmax). Como posso ajudar você hoje com sua proteção ou cotação?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Don't display floating widget on admin screens
  if (pathname?.startsWith('/admin')) {
    return null
  }

  const quickChips = [
    'Quais coberturas estão inclusas?',
    'Aceita carro de leilão ou aplicativo?',
    'Como funciona a vistoria online?',
    'Tem consulta ao SPC/Serasa?',
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async (messageText?: string) => {
    const text = messageText || input
    if (!text.trim() || isLoading) return

    const newMsgs = [...messages, { role: 'user' as const, text }]
    setMessages(newMsgs)
    if (!messageText) setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/luna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: newMsgs.map((m) => ({ role: m.role, content: m.text })),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setMessages([...newMsgs, { role: 'assistant', text: data.reply }])
      } else {
        setMessages([
          ...newMsgs,
          { role: 'assistant', text: 'Desculpe, tive uma instabilidade momentânea. Pode me perguntar novamente ou chamar no WhatsApp oficial (84) 2018-2178!' },
        ])
      }
    } catch {
      setMessages([
        ...newMsgs,
        { role: 'assistant', text: 'Erro de conexão. Se preferir, fale direto conosco pelo WhatsApp (84) 2018-2178!' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Trigger Button (Posicionado à esquerda para não sobrepor o WhatsApp que fica à direita) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat com IA Luna"
          className={`fixed ${naHome ? 'bottom-[80px]' : 'bottom-4'} right-4 z-40 flex items-center gap-2 rounded-full border border-go-orange/30 bg-navy-950 p-1.5 text-white shadow-2xl transition hover:-translate-y-1 hover:border-go-orange hover:shadow-go-orange/20 active:translate-y-0 sm:bottom-6 sm:left-6 sm:right-auto sm:px-4 sm:py-3`}
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-go-orange to-amber-300 text-navy-950 sm:h-8 sm:w-8">
            <Bot className="h-4 w-4" />
            <span aria-hidden className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-navy-950" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-black tracking-tight text-white">IA Luna</span>
            <span className="block text-[10px] font-bold text-go-lime">Dúvidas da 21Go</span>
          </div>
        </button>
      )}

      {/* Chat Window Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-4 left-4 z-50 flex h-[540px] w-[92vw] max-w-[380px] flex-col rounded-3xl border border-navy-700 bg-white shadow-2xl overflow-hidden entrar-suave">
          {/* Header */}
          <div className="flex items-center justify-between bg-navy-950 p-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-go-orange to-amber-300 text-navy-950 shadow">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-sm font-extrabold text-white">Luna • 21Go IA</h3>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">Online</span>
                </div>
                <p className="text-[10px] text-muted-soft">Consultora Virtual Oficial CITmax</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-muted-soft transition hover:bg-navy-900 hover:text-white"
              aria-label="Fechar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick chips banner */}
          <div className="border-b border-line bg-surface-50 p-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">Perguntas Frequentes:</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {quickChips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-navy-800 transition hover:border-go-orange hover:bg-orange-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-950 text-go-orange text-[10px]">
                    <Bot className="h-3 w-3" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-navy-950 text-white rounded-tr-none'
                      : 'bg-surface-100 text-navy-900 rounded-tl-none border border-line'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted font-medium">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-950 text-go-orange animate-pulse">
                  <Bot className="h-3 w-3" />
                </div>
                <span>Luna está digitando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom WhatsApp Shortcut & Input */}
          <div className="border-t border-line bg-white p-3 flex flex-col gap-2">
            <a
              href="https://wa.me/558420182178?text=Ol%C3%A1%2C%20estava%20conversando%20com%20a%20Luna%20no%20site%20e%20gostaria%20de%20atendimento%20humano."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              Preferir falar com um consultor humano no WhatsApp?
            </a>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte qualquer coisa sobre a 21Go..."
                className="flex-1 rounded-xl border border-line bg-surface-50 px-3 py-2 text-xs text-navy-900 placeholder:text-muted focus:border-navy-950 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-white transition hover:bg-navy-900 disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
