'use client'

import React, { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Logo } from '@/components/home/SiteChrome'

const inputCls =
  'min-h-[48px] w-full rounded-lg border border-[#c9d1e6] bg-white px-3.5 text-base text-navy-800 placeholder:text-muted-2'

function LoginForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.success) {
        // Só segue para caminhos internos do painel (evita open redirect).
        const next = params.get('next') || ''
        const dest = next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login')
          ? next
          : '/admin'
        window.location.assign(dest)
        return
      }
      setError(data.error || 'Não foi possível entrar agora. Tente novamente.')
      setPassword('')
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-navy-line bg-navy-950">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
          <Logo size={48} href="/" subtitle="PAINEL DA FRANQUIA" />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] justify-center px-5 pb-16 pt-12 sm:px-6 sm:pt-20">
        <section className="w-full max-w-[440px] rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-xs font-bold tracking-[1.5px] text-go-orange-dark">
                <Lock aria-hidden className="h-3.5 w-3.5" />
                USO INTERNO
              </span>
              <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.8px]">Entrar no painel</h1>
              <p className="m-0 text-base text-muted">Acesso restrito à equipe da franquia.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-email" className="text-sm font-semibold">
                  E-mail
                </label>
                <input
                  id="admin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-password" className="text-sm font-semibold">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-100"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden className="h-5 w-5" />
                    ) : (
                      <Eye aria-hidden className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="m-0 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-go-orange text-[17px] font-extrabold text-navy-950 transition hover:-translate-y-px hover:shadow-cta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {busy ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-50" />}>
      <LoginForm />
    </Suspense>
  )
}
