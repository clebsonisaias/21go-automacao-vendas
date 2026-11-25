// Roda uma vez quando o servidor Next sobe. Só no runtime Node (o código usa fs/crypto).
// O import precisa ficar DENTRO deste if: é assim que o build o exclui do runtime Edge.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const node = await import('./instrumentation-node')
    if (process.env.MP_ACCESS_TOKEN) node.startPaymentReconciler()
    if (process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN) node.startSocialScheduler()
    if (process.env.CRM_EMAIL && process.env.CRM_PASSWORD) node.startVistoriaLinkScheduler()
    // Resumo diário das cotações paradas no CRM; CARTEIRA_ALERTA=off desliga.
    if (process.env.CRM_EMAIL && process.env.CRM_PASSWORD && process.env.CARTEIRA_ALERTA !== 'off') node.startAlertaCarteira()
    // Lembretes por WhatsApp: só com o gateway configurado; LEMBRETES_WHATSAPP=off desliga.
    if (process.env.CITCHAT_GATEWAY_TOKEN && process.env.LEMBRETES_WHATSAPP !== 'off') node.startLembretes()
    // Lembretes da cotação pedida pelo WhatsApp na home; COTACAO_LEMBRETES=off desliga.
    if (process.env.CITCHAT_GATEWAY_TOKEN && process.env.COTACAO_LEMBRETES !== 'off') node.startLembretesCotacao()
  }
}
