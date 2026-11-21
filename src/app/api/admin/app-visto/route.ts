import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef, updateLead } from '@/lib/db'
import { sendWhatsAppAppVisto } from '@/lib/citchat'
import { esc, sendTelegramNotification } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/** Só links https de verdade (o link vem do CRM; nada de javascript: ou http). */
function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:' || u.username || u.password) return null
    return u.toString().slice(0, 600)
  } catch {
    return null
  }
}

/**
 * POST { ref, url } → guarda o link do App Visto (gerado no CRM), manda no WhatsApp do cliente
 * e deixa o link visível na tela do site em que ele está (/vistoria consulta /api/vistoria/situacao).
 */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : ''
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ success: false, error: 'Cadastro não encontrado.' }, { status: 404 })

  const url = cleanUrl(body?.url)
  if (!url) {
    return NextResponse.json({ success: false, error: 'Cole o link completo do App Visto (começa com https://).' }, { status: 400 })
  }

  const updated = updateLead(lead.ref, (l) => {
    l.appVistoUrl = url
    l.appVistoEnviadoEm = new Date().toISOString()
  })

  const wa = await sendWhatsAppAppVisto({ telefone: lead.whatsapp, nome: lead.nome, url })
  await sendTelegramNotification(
    `📸 <b>Link do App Visto enviado</b> — ${esc(lead.nome)} (${esc(lead.placa || 'sem placa')}). ${
      wa.success ? 'Cliente recebeu no WhatsApp e vê o link no site.' : 'WhatsApp falhou; o link está no site do cliente.'
    }`
  )

  return NextResponse.json({
    success: true,
    lead: updated,
    whatsappEnviado: wa.success,
    message: wa.success
      ? 'Link enviado no WhatsApp e mostrado no site do cliente.'
      : 'Link mostrado no site do cliente. O WhatsApp não foi enviado.',
  })
}
