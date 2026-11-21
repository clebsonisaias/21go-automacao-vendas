// Roda uma vez quando o servidor Next sobe. Só no runtime Node (o código de pagamento usa fs/crypto).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.MP_ACCESS_TOKEN) {
    const { startPaymentReconciler } = await import('./instrumentation-node')
    startPaymentReconciler()
  }
}
