'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bot, CheckCircle2, Copy, ExternalLink, Loader2, MessageCircle, X } from 'lucide-react'
import type { StoredLead } from '@/lib/db'
import { brl } from '@/lib/site'
import { DocumentAiUploader } from '@/components/common/DocumentAiUploader'
import type { DocumentAiResult } from '@/lib/types'
import { StatusLabel } from './lead-status'
import { Tooltip } from './Tooltip'
import { VISTORIA_SLOTS, type VistoriaSlot } from '@/lib/vistoria-slots'

const SITE = 'https://21go.seg.br'

export function vistoriaUrlFor(lead: StoredLead): string {
  return `${SITE}/vistoria?ref=${encodeURIComponent(lead.ref || lead.id)}&nome=${encodeURIComponent(
    lead.nome || ''
  )}&placa=${encodeURIComponent(lead.placa || '')}&veiculo=${encodeURIComponent(
    `${lead.vehicle.marca} ${lead.vehicle.modelo}`
  )}`
}

// Texto enviado ao cliente pelo WhatsApp (conteúdo da mensagem, não UI).
export function proposalText(lead: StoredLead): string {
  return `Olá${lead.nome ? `, ${lead.nome.split(" ")[0]}` : ""}! Tudo bem? Aqui é o Clebson da 21Go Proteção Veicular. 🚗

Segue a proposta para o seu veículo:
🚘 *${lead.vehicle.marca} ${lead.vehicle.modelo} (${lead.vehicle.ano})*
${lead.placa ? `🔢 *Placa:* ${lead.placa}\n` : ''}⭐ *Plano:* ${lead.planoEscolhidoNome}
💰 *Taxa de ativação:* ${brl(lead.ativacao)}
💳 *Mensalidade com desconto:* ${brl(lead.mensalidadeFinal)}/mês

🛡️ *Coberturas:*
• Roubo, furto, colisão e perda total (100% Tabela FIPE)
• Assistência 24h com guincho
• Sem perfil de condutor e sem consulta SPC/Serasa

👉 *Para concluir, faça a vistoria digital no link:*
${vistoriaUrlFor(lead)}

Qualquer dúvida, estou à disposição!`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-navy-800">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-4 first:border-t-0">
      <h3 className="m-0 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <dl className="m-0 divide-y divide-line">{children}</dl>
    </section>
  )
}

const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:text-muted'

export function LeadDrawer({
  lead,
  onClose,
  onApproved,
  notify,
}: {
  lead: StoredLead
  onClose: () => void
  onApproved: () => Promise<void> | void
  notify: (message: string, tone?: 'ok' | 'error') => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [approving, setApproving] = useState(false)
  const [closing, setClosing] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [appVisto, setAppVisto] = useState(lead.appVistoUrl || '')
  const [sendingVisto, setSendingVisto] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState(lead)
  // onClose em ref: o efeito de foco roda só ao abrir/fechar, não a cada re-render do pai.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => setDraft(lead), [lead])

  // Foco: entra no botão fechar, fica preso no painel e volta para quem abriu.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(message)
    } catch {
      notify('Não foi possível copiar. Selecione o texto manualmente.', 'error')
    }
  }

  const approve = async () => {
    setApproving(true)
    try {
      const res = await fetch('/api/admin/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: lead.ref }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        notify(data.message || (data.whatsappEnviado ? 'Vistoria aprovada. Cliente avisado no WhatsApp.' : 'Vistoria aprovada. WhatsApp não enviado: avise o cliente.'))
        await onApproved()
      } else {
        notify(data?.error || 'Não foi possível aprovar. Tente de novo.', 'error')
      }
    } catch {
      notify('Sem conexão. Tente de novo.', 'error')
    } finally {
      setApproving(false)
    }
  }

  const encerrar = async () => {
    if (closing === 'idle') {
      setClosing('confirm')
      return
    }
    setClosing('busy')
    try {
      const res = await fetch('/api/admin/encerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: lead.ref }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.lead) setDraft(data.lead)
        notify(data.message || 'Cadastro encerrado.')
        await onApproved()
      } else {
        notify(data?.error || 'Não foi possível encerrar. Tente de novo.', 'error')
      }
    } catch {
      notify('Sem conexão. Tente de novo.', 'error')
    } finally {
      setClosing('idle')
    }
  }

  const sendAppVisto = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingVisto(true)
    try {
      const res = await fetch('/api/admin/app-visto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: lead.ref, url: appVisto }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.lead) setDraft(data.lead)
        notify(data.message || 'Link enviado.')
        await onApproved()
      } else {
        notify(data?.error || 'Não foi possível enviar o link. Tente de novo.', 'error')
      }
    } catch {
      notify('Sem conexão. Tente de novo.', 'error')
    } finally {
      setSendingVisto(false)
    }
  }

  const generatePitch = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/luna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pitch', lead }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success && data.pitch) await copy(data.pitch, 'Proposta da IA copiada.')
      else await copy(proposalText(lead), 'IA indisponível. Texto padrão copiado.')
    } catch {
      await copy(proposalText(lead), 'IA indisponível. Texto padrão copiado.')
    } finally {
      setGenerating(false)
    }
  }

  const onDocument = (result: DocumentAiResult) => {
    setDraft((prev) => ({
      ...prev,
      nome: result.personal?.nome || prev.nome,
      cpf: result.personal?.cpf || prev.cpf,
      placa: result.vehicle?.placa || prev.placa,
    }))
    notify('Dados lidos do documento. Confira antes de usar.')
  }

  const assoc = (draft.rawCrm as { associado?: Record<string, string> } | undefined)?.associado
  const endereco = assoc?.endereco
    ? [assoc.endereco, assoc.numero, assoc.bairro, assoc.cep ? `CEP ${assoc.cep}` : ''].filter(Boolean).join(', ')
    : ''
  const pago = draft.pagamento?.paidAt
  const arquivos = Object.entries(draft.vistoriaArquivos || {})

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden className="absolute inset-0 bg-navy-deep/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-drawer-title"
        className="admin-light relative flex h-full w-full flex-col bg-white shadow-[-8px_0_32px_rgba(7,12,34,0.08)] border-l border-line sm:max-w-[480px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id="lead-drawer-title" className="m-0 truncate text-lg font-semibold text-navy-900">
              {draft.nome || "Aguardando documentos"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusLabel status={draft.status} />
              <span className="text-sm text-muted">
                {new Date(draft.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          </div>
          <Tooltip label="Fechar detalhes" kbd="Esc" side="left">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes"
              aria-keyshortcuts="Escape"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-100 hover:text-navy-900"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </Tooltip>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section title="Contato">
            <Field label="WhatsApp">{draft.whatsapp}</Field>
            <Field label="CPF">{draft.cpf || '—'}</Field>
            <Field label="E-mail">{draft.email || '—'}</Field>
            <Field label="Cidade">{draft.cidade || '—'}</Field>
            {endereco && <Field label="Endereço">{endereco}</Field>}
            {assoc?.cnh && <Field label="CNH">{assoc.cnh}</Field>}
          </Section>

          <Section title="Veículo">
            <Field label="Modelo">
              {draft.vehicle.marca} {draft.vehicle.modelo} ({draft.vehicle.ano})
            </Field>
            <Field label="Placa">
              <span className="font-mono tracking-wider">{draft.placa || '—'}</span>
            </Field>
            <Field label="FIPE">
              {brl(draft.vehicle.fipeValue || 0)}
              <span className="text-muted"> · {draft.vehicle.fipeCode}</span>
            </Field>
            {draft.vehicle.cor && <Field label="Cor">{draft.vehicle.cor}</Field>}
            {draft.vehicle.combustivel && <Field label="Combustível">{draft.vehicle.combustivel}</Field>}
            {draft.vehicle.chassi && (
              <Field label="Chassi">
                <span className="font-mono text-xs">{draft.vehicle.chassi}</span>
              </Field>
            )}
            <Field label="App ou táxi">{draft.veiculoTrabalho ? 'Sim' : 'Não'}</Field>
          </Section>

          <Section title="Plano e pagamento">
            <Field label="Plano">{draft.planoEscolhidoNome}</Field>
            <Field label="Mensalidade">{brl(draft.mensalidadeFinal)}/mês</Field>
            <Field label="Adesão">
              {brl(draft.ativacao)}
              {draft.cupom ? ` (cupom ${draft.cupom.codigo}, de ${brl(draft.ativacaoOriginal ?? draft.ativacao)})` : ''}
            </Field>
            {draft.pagamento && (
              <Field label="Pix da adesão">
                {pago ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                    Pago em {new Date(pago).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                ) : (
                  'Aguardando pagamento'
                )}
              </Field>
            )}
            {draft.diaVencimento && <Field label="Vencimento">Todo dia {draft.diaVencimento}</Field>}
            <Field label="Adesivo 21Go">{draft.comAdesivo ? 'Sim' : 'Não'}</Field>
            {draft.powercrmCode && (
              <Field label="Código CRM">
                <span className="font-mono text-xs">{draft.powercrmCode}</span>
              </Field>
            )}
            {draft.checkoutUrl && (
              <Field label="Cotação Power">
                <a
                  href={draft.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-navy-600 underline-offset-2 hover:underline"
                >
                  Abrir checkout
                  <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                </a>
              </Field>
            )}
          </Section>

          <Section title="Vistoria e documentos">
            {arquivos.length > 0 ? (
              <>
                {arquivos.map(([slot, meta]) => (
                  <Field key={slot} label={VISTORIA_SLOTS[slot as VistoriaSlot]?.label || slot}>
                    <a
                      href={`/api/admin/vistoria/arquivo?ref=${encodeURIComponent(draft.ref)}&slot=${slot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-navy-600 underline-offset-2 hover:underline"
                    >
                      Abrir {meta.ext.toUpperCase()}
                      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-muted"> · {(meta.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB</span>
                  </Field>
                ))}
                {draft.vistoriaData?.enviadoEm && (
                  <Field label="Concluída em">
                    {new Date(draft.vistoriaData.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </Field>
                )}
              </>
            ) : draft.vistoriaData ? (
              <p className="m-0 py-2 text-sm text-muted">
                Vistoria antiga: o site ainda não guardava os arquivos. Peça os documentos ao cliente pelo WhatsApp.
              </p>
            ) : (
              <p className="m-0 py-2 text-sm text-muted">O cliente ainda não enviou a vistoria.</p>
            )}
            <form onSubmit={sendAppVisto} className="flex flex-col gap-2 pt-3">
              <label htmlFor="app-visto-url" className="text-sm font-medium text-navy-900">
                Link da vistoria
              </label>
              <p className="m-0 text-xs text-muted">
                {draft.appVistoUrl
                  ? 'Link já entregue ao cliente.'
                  : draft.crmVistoria?.ultimoErro
                    ? `O site está tentando gerar sozinho no CRM 21Go (${draft.crmVistoria.tentativas} tentativas). Último motivo: ${draft.crmVistoria.ultimoErro}. Se preferir, gere no CRM e cole aqui.`
                    : 'O site gera sozinho no CRM 21Go depois dos documentos. Só cole aqui se precisar mandar outro link.'}
              </p>
              <input
                id="app-visto-url"
                type="url"
                inputMode="url"
                required
                placeholder="https://"
                value={appVisto}
                onChange={(e) => setAppVisto(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-line px-3 text-sm text-navy-900 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/20"
              />
              <button
                type="submit"
                disabled={sendingVisto}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-navy-800 px-4 text-sm font-semibold text-navy-900 transition-colors hover:bg-surface-100 disabled:cursor-wait"
              >
                {sendingVisto && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {sendingVisto ? 'Enviando…' : draft.appVistoUrl ? 'Enviar de novo ao cliente' : 'Enviar ao cliente (WhatsApp e site)'}
              </button>
              {draft.appVistoEnviadoEm && (
                <p className="m-0 text-xs text-muted">
                  Enviado em {new Date(draft.appVistoEnviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. O cliente vê o link no site.
                </p>
              )}
            </form>
            <div className="pt-3">
              <DocumentAiUploader label="Ler CNH ou CRLV com IA" onExtracted={onDocument} />
            </div>
          </Section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-line bg-surface-50 px-6 py-4">
          {draft.status === 'vistoria_enviada' && (
            <button
              type="button"
              onClick={approve}
              disabled={approving}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-wait disabled:bg-navy-700"
            >
              {approving ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden className="h-4 w-4" />
              )}
              {approving ? 'Aprovando…' : pago ? 'Aprovar vistoria e avisar cliente' : 'Vistoria aprovada: enviar Pix da adesão'}
            </button>
          )}
          <a
            href={`https://wa.me/${draft.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(proposalText(draft))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-go-whatsapp-dark px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0f7a3c]"
          >
            <MessageCircle aria-hidden className="h-4 w-4" />
            Enviar proposta no WhatsApp
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => copy(vistoriaUrlFor(draft), 'Link da vistoria copiado.')}>
              <Copy aria-hidden className="h-4 w-4" />
              Copiar link vistoria
            </button>
            <button type="button" className={btnSecondary} onClick={() => copy(proposalText(draft), 'Proposta copiada.')}>
              <Copy aria-hidden className="h-4 w-4" />
              Copiar proposta
            </button>
            <button type="button" className={`${btnSecondary} col-span-2`} onClick={generatePitch} disabled={generating}>
              {generating ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Bot aria-hidden className="h-4 w-4" />}
              {generating ? 'Gerando…' : 'Gerar proposta com IA'}
            </button>
          </div>
                  {draft.status !== 'cancelado' && !pago && (
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                onClick={encerrar}
                disabled={closing === 'busy'}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-wait ${
                  closing === 'idle'
                    ? 'text-red-700 hover:bg-red-50'
                    : 'bg-red-700 text-white hover:bg-red-800'
                }`}
              >
                {closing === 'busy' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {closing === 'idle'
                  ? 'Encerrar cadastro'
                  : `Confirmar: encerrar o cadastro de ${draft.nome || 'cliente sem nome'}`}
              </button>
              {closing === 'confirm' && (
                <p className="m-0 text-center text-xs text-muted">
                  Para a vistoria, o acompanhamento no CRM e o Pix deste cadastro. O histórico continua aqui.{' '}
                  <button type="button" onClick={() => setClosing('idle')} className="font-semibold text-navy-700 underline">
                    Manter cadastro
                  </button>
                </p>
              )}
            </div>
          )}
</footer>
      </div>
    </div>
  )
}
