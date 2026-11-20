'use client'

import React, { useState } from 'react'
import { Sparkles, Send, Copy, Bot, Check, HelpCircle, ShieldAlert, MessageSquare } from 'lucide-react'

export function LunaAssistant() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Olá! Sou a Luna, sua consultora de IA para a 21Go Proteção Veicular (CITmax). Posso gerar scripts de WhatsApp sob medida para qualquer lead, contornar objeções de clientes (ex: "é seguro?", "tá caro", "vou pensar") ou tirar dúvidas de cobertura. Como posso te ajudar agora?',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const quickPrompts = [
    'Como contornar a objeção: "Proteção veicular é golpe / não é seguro"?',
    'Gere um script curto de fechamento no WhatsApp com urgência amigável.',
    'Como explicar a Lei Complementar 213/2025 para tranquilizar um cliente indeciso?',
    'Script para resgatar cliente que visualizou a proposta e não respondeu.',
  ]

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText
    if (!text.trim() || isLoading) return

    const newMessages = [...messages, { role: 'user' as const, text }]
    setMessages(newMessages)
    if (!textToSend) setInputText('')
    setIsLoading(true)

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.text,
      }))

      const res = await fetch('/api/ai/luna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', messages: apiMessages }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setMessages([...newMessages, { role: 'assistant', text: data.reply }])
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', text: `Erro da IA Luna: ${data.error || 'Não foi possível responder.'}` },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', text: 'Erro de comunicação com o servidor da Luna.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2500)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-navy-700 bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-go-orange to-amber-300 text-navy-950 shadow-lg shadow-go-orange/20">
            <Bot className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">Luna IA • Copiloto 21Go</h2>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                GPT-4o Online
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-soft">
              Consultora virtual treinada no regulamento 21Go, Lei 213/2025 e técnicas de fechamento no WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Sugestões Rápidas */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            className="flex items-start gap-2.5 rounded-xl border border-line bg-white p-3.5 text-left text-xs font-semibold text-navy-800 transition hover:border-go-orange hover:bg-orange-50/50 hover:shadow-sm"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-go-orange" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="flex flex-col rounded-2xl border border-line bg-white shadow-card overflow-hidden">
        <div className="flex flex-col gap-4 p-5 max-h-[500px] overflow-y-auto">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-go-orange">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-navy-950 text-white rounded-tr-none'
                    : 'bg-surface-100 text-navy-900 rounded-tl-none border border-line'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => handleCopy(m.text, idx)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-muted transition hover:text-navy-950"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar para WhatsApp</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center text-xs text-muted font-bold">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-go-orange animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <span>Luna está formulando a resposta com GPT-4o...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-line bg-surface-50 p-3.5">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Peça à Luna um script, resposta para objeção ou dúvida da 21Go..."
              className="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-navy-900 placeholder:text-muted focus:border-navy-950 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-navy-950 px-5 text-xs font-bold text-white transition hover:bg-navy-900 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
