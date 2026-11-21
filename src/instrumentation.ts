// Roda uma vez quando o servidor Next sobe. Só no runtime Node (o código usa fs/crypto).
// O import precisa ficar DENTRO deste if: é assim que o build o exclui do runtime Edge.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const node = await import('./instrumentation-node')
    if (process.env.MP_ACCESS_TOKEN) node.startPaymentReconciler()
    if (process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN) node.startSocialScheduler()
    if (process.env.CRM_EMAIL && process.env.CRM_PASSWORD) node.startVistoriaLinkScheduler()
  }
}
