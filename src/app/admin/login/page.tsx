'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        router.push('/admin')
        router.refresh()
      } else {
        setError(data.error || 'Credenciais inválidas. Verifique usuário e senha.')
      }
    } catch {
      setError('Erro de conexão ao servidor. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 py-12 selection:bg-go-orange selection:text-navy-950">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-go-orange/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-go-lime/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Header Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-card">
              <Image
                src="/images/logo-21go.png"
                alt="21Go Proteção Veicular"
                width={48}
                height={48}
                className="h-auto w-auto object-contain"
                priority
              />
            </div>
            <div className="text-left">
              <span className="block font-heading text-2xl font-black uppercase tracking-tight text-white">
                21Go
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold tracking-widest text-go-lime uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-go-lime" /> Franquia CITmax
              </span>
            </div>
          </div>

          <h1 className="font-heading text-xl font-extrabold text-white">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-xs text-muted-soft">
            Acesso exclusivo à gestão de cotações, vistorias e IA Luna.
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-soft">
                Usuário
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-soft">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-500 transition focus:border-go-orange focus:outline-none focus:ring-1 focus:ring-go-orange"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-soft">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-soft">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoFocus
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
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-go-orange text-sm font-bold text-navy-950 shadow-cta transition hover:-translate-y-0.5 hover:bg-go-orange-hover hover:shadow-cta active:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Validando acesso...</span>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-navy-800 pt-4 text-center">
            <span className="text-[11px] text-muted-soft">
              Acesso seguro com criptografia e sessão persistente de 7 dias.
            </span>
          </div>
        </div>

        {/* Link voltar */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-soft transition hover:text-white"
          >
            ← Voltar para o site 21Go
          </Link>
        </div>
      </div>
    </div>
  )
}
