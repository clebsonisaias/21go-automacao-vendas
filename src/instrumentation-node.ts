import { reconcilePendingPayments } from './lib/orchestrator'
import { socialTick } from './lib/instagram'
import { acompanharVistorias, gerarLinksPendentes } from './lib/crm-vistoria'
import { lembretesTick } from './lib/lembretes'

function every(ms: number, label: string, job: () => Promise<unknown>) {
  let running = false
  const timer = setInterval(async () => {
    if (running) return
    running = true
    try {
      await job()
    } catch (err) {
      console.error(`[${label}] erro:`, err instanceof Error ? err.message : err)
    } finally {
      running = false
    }
  }, ms)
  timer.unref?.()
}

// Conferência periódica (60 s) dos Pix pendentes: cobre webhook que não chegou ou cliente que fechou a página.
export function startPaymentReconciler() {
  every(60_000, 'Reconciliador', reconcilePendingPayments)
}

// Instagram: a cada 5 min confere se já é hora do post do dia.
export function startSocialScheduler() {
  every(5 * 60_000, 'Instagram', socialTick)
}

// Vistoria: a cada 1 min gera no CRM 21Go o link dos cadastros que já mandaram os documentos.
export function startVistoriaLinkScheduler() {
  every(60_000, 'Vistoria CRM', async () => {
    await gerarLinksPendentes()
    await acompanharVistorias()
  })
}

// Lembretes de etapa parada (documentos, vistoria, Pix) pelo WhatsApp: confere a cada 10 min.
export function startLembretes() {
  const ms = Number(process.env.LEMBRETES_INTERVALO_MS) || 10 * 60_000
  every(ms, 'Lembretes', () => lembretesTick())
}
