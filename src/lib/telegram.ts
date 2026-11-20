/**
 * Disparador de Notificações para o Telegram
 */
export async function sendTelegramNotification(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env')
    return false
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      console.error('[Telegram] Erro ao enviar mensagem:', await res.text())
      return false
    }

    return true
  } catch (err) {
    console.error('[Telegram] Falha na requisição:', err)
    return false
  }
}
