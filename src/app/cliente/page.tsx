'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogoCompleto } from '@/components/Marca'
import Link from 'next/link'
import { Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, PhoneCall, Sparkles } from 'lucide-react'

export default function ClienteLoginPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Se já estiver logado, redireciona para o dashboard
  useEffect(() => {
    try {
      const token = localStorage.getItem('hinova_associado_token')
      if (token) {
        router.push('/cliente/dashboard')
      }
    } catch {}
  }, [router])

  // Máscara de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
    }
    setCpf(v)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/cliente/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cpf.replace(/\D/g, ''),
          senha,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        localStorage.setItem('hinova_associado_token', data.token)
        localStorage.setItem('hinova_associado_dados', JSON.stringify(data.associado))
        router.push('/cliente/dashboard')
      } else {
        setError(data.error || 'Credenciais inválidas. Verifique seu CPF e senha.')
      }
    } catch {
      setError('Erro de conexão ao servidor. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Atalho para teste rápido
  const handleDemoLogin = () => {
    setCpf('084.123.456-78')
    setSenha('demo123')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 py-12 selection:bg-go-orange selection:text-navy-950">
      {/* Background glow visual */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-go-orange/10 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-go-lime/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Branding e Cabeçalho */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-4 flex flex-col items-center gap-2 transition hover:opacity-90">
            <LogoCompleto altura={64} priority />
            <span className="flex items-center gap-1 text-xs font-semibold tracking-widest text-go-lime uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-go-lime" /> Central do Associado
            </span>
          </Link>

          <h1 className="font-heading text-xl font-extrabold text-white">
            Acesse seu Espaço 21Go
          </h1>
          <p className="mt-1 text-xs text-muted-soft">
            Solicite guincho 24h, consulte 2ª via de boletos e acesse sua carteirinha digital.
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-soft">
                CPF do Associado
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-soft">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-500 transition focus:border-go-orange focus:outline-none focus:ring-1 focus:ring-go-orange"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-soft">
                  Senha
                </label>
                <a
                  href="https://wa.me/558420182178?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20para%20recuperar%20minha%20senha%20na%20Central%20do%20Associado%2021Go."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-go-orange hover:underline"
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-soft">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-3 pl-10 pr-11 text-sm text-white placeholder-navy-500 transition focus:border-go-orange focus:outline-none focus:ring-1 focus:ring-go-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-soft hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-go-orange text-sm font-bold text-navy-950 shadow-cta transition hover:-translate-y-0.5 hover:bg-go-orange-hover hover:shadow-cta active:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Autenticando no SGA...</span>
              ) : (
                <>
                  <span>Entrar na Central</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Atalho Demo para Desenvolvimento e Testes */}
          <div className="mt-5 border-t border-navy-800 pt-4">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-navy-700 bg-navy-950/50 py-2 text-xs font-semibold text-muted-soft transition hover:border-go-lime/50 hover:text-go-lime"
            >
              <Sparkles className="h-3.5 w-3.5 text-go-lime" />
              Preencher com Associado Demo
            </button>
          </div>
        </div>

        {/* Suporte e Contato Rápido */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-soft">
            Dúvidas ou primeiro acesso?
          </p>
          <a
            href="https://wa.me/558420182178?text=Ol%C3%A1%2C%20sou%20associado%2021Go%20e%20preciso%20de%20suporte."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-go-lime hover:underline"
          >
            <PhoneCall className="h-3.5 w-3.5" /> Falar com o Atendimento 21Go (CITmax)
          </a>
        </div>
      </div>
    </div>
  )
}
