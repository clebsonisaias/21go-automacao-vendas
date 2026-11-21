// E-mail ao cliente pela API da Brevo (transacional). Sem BREVO_API_KEY e MAIL_FROM no Coolify,
// nada é enviado e o fluxo segue normal (o WhatsApp e a tela do site continuam valendo).
//
// Variáveis: BREVO_API_KEY, MAIL_FROM ("21Go CITmax <contato@21go.seg.br>"; o domínio precisa estar
// autenticado na Brevo), MAIL_REPLY_TO (opcional).

const BREVO_API = (process.env.BREVO_API_BASE || 'https://api.brevo.com').replace(/\/+$/, '')

export function emailEnabled(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM)
}

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/)
  return m ? { name: m[1] || '21Go', email: m[2] } : { name: '21Go CITmax', email: raw.trim() }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Monta um e-mail simples: título, parágrafos e um botão opcional. */
function layout(titulo: string, paragrafos: string[], botao?: { texto: string; url: string }): { html: string; text: string } {
  const ps = paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#1f2a44">${escapeHtml(p)}</p>`).join('')
  const btn = botao
    ? `<p style="margin:22px 0"><a href="${escapeHtml(botao.url)}" style="display:inline-block;background:#0b1230;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${escapeHtml(botao.texto)}</a></p><p style="margin:0 0 14px;font-size:13px;color:#5b6478">Se o botão não abrir, copie este endereço: ${escapeHtml(botao.url)}</p>`
    : ''
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">
<p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#f2911d">21Go CITmax · Proteção veicular</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#0b1230">${escapeHtml(titulo)}</h1>${ps}${btn}
<p style="margin:24px 0 0;font-size:13px;color:#5b6478">Dúvidas? Responda este e-mail ou fale com a gente no WhatsApp.</p></div>`
  const text = [titulo, '', ...paragrafos, ...(botao ? ['', `${botao.texto}: ${botao.url}`] : [])].join('\n')
  return { html, text }
}

export async function sendEmail(params: {
  para: string | undefined
  nome?: string
  assunto: string
  titulo: string
  paragrafos: string[]
  botao?: { texto: string; url: string }
}): Promise<{ success: boolean; error?: string }> {
  const to = String(params.para || '').trim()
  if (!emailEnabled()) return { success: false, error: 'e-mail não configurado' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { success: false, error: 'cliente sem e-mail válido' }
  const { html, text } = layout(params.titulo, params.paragrafos, params.botao)
  try {
    const res = await fetch(`${BREVO_API}/v3/smtp/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': process.env.BREVO_API_KEY as string },
      body: JSON.stringify({
        sender: parseFrom(process.env.MAIL_FROM as string),
        to: [{ email: to, ...(params.nome ? { name: params.nome } : {}) }],
        ...(process.env.MAIL_REPLY_TO ? { replyTo: { email: process.env.MAIL_REPLY_TO } } : {}),
        subject: params.assunto,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) return { success: true }
    const err = await res.text().catch(() => '')
    console.warn('[E-mail] Brevo recusou:', res.status, err.slice(0, 200))
    return { success: false, error: `Brevo ${res.status}` }
  } catch (err) {
    console.warn('[E-mail] falha de rede:', err instanceof Error ? err.message : err)
    return { success: false, error: 'falha de rede' }
  }
}
