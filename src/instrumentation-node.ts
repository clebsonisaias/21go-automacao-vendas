import { reconcilePendingPayments } from './lib/orchestrator'
import { socialTick } from './lib/instagram'

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
