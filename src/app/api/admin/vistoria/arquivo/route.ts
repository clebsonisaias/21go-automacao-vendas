import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef } from '@/lib/db'
import { isVistoriaSlot, readVistoriaFile } from '@/lib/vistoria-files'

export const dynamic = 'force-dynamic'

/** GET ?ref=&slot= → devolve o documento/foto da vistoria. Somente painel autenticado. */
export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked

  const q = new URL(req.url).searchParams
  const slot = q.get('slot') || ''
  const lead = findLeadByRef((q.get('ref') || '').slice(0, 80))
  const meta = lead && isVistoriaSlot(slot) ? lead.vistoriaArquivos?.[slot] : undefined
  const buf = lead && meta && isVistoriaSlot(slot) ? readVistoriaFile(lead.id, slot, meta.ext) : null
  if (!meta || !buf) {
    return NextResponse.json({ success: false, error: 'Arquivo não encontrado.' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': meta.mime,
      'Content-Length': String(buf.length),
      'Content-Disposition': `inline; filename="${slot}.${meta.ext}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // PDF/imagem abertos direto: sem scripts nem carregamentos externos.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  })
}
