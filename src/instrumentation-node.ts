import { reconcilePendingPayments } from './lib/orchestrator'

// Conferência periódica (60 s) dos Pix pendentes: cobre webhook que não chegou ou cliente que fechou a página.
export function startPaymentReconciler() {
  let running = false
  const timer = setInterval(async () => {
    if (running) return
    running = true
    try {
      await reconcilePendingPayments()
    } catch (err) {
      console.error('[Reconciliador] erro:', err instanceof Error ? err.message : err)
    } finally {
      running = false
    }
  }, 60_000)
  timer.unref?.()
}
