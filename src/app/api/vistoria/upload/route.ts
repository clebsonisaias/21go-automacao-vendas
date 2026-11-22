import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef } from '@/lib/db'
import { bloqueioDoCadastro, receberArquivo } from '@/lib/documentos'
import { rateLimit } from '@/lib/rate-limit'
import { MAX_FILE_BYTES, isVistoriaSlot } from '@/lib/vistoria-files'

export const dynamic = 'force-dynamic'

/**
 * POST multipart { ref, slot, file } → grava um documento ou foto da vistoria.
 * A ref (UUID) do cadastro é a credencial. Tipo conferido pelo conteúdo; tamanho limitado.
 */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'vistoria-upload', 60, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitos envios. Aguarde alguns minutos e tente de novo.' }, { status: 429 })
    }
    const declared = Number(req.headers.get('content-length') || 0)
    if (declared > MAX_FILE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Arquivo acima de 12 MB. Envie uma foto menor.' }, { status: 413 })
    }

    const form = await req.formData()
    const ref = String(form.get('ref') || '').slice(0, 80)
    const slot = String(form.get('slot') || '')
    const file = form.get('file')

    const lead = ref ? findLeadByRef(ref) : undefined
    if (!lead) {
      return NextResponse.json({ error: 'Link de vistoria inválido ou expirado. Faça uma nova cotação.' }, { status: 404 })
    }
    const bloqueio = bloqueioDoCadastro(lead)
    if (bloqueio) return NextResponse.json({ error: bloqueio.erro }, { status: bloqueio.status })
    if (!isVistoriaSlot(slot) || !(file instanceof File)) {
      return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Arquivo vazio ou acima de 12 MB. Envie uma foto menor.' }, { status: 413 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const r = receberArquivo(lead, slot, buf, file.name)
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })

    return NextResponse.json({ success: true, slot })
  } catch (err) {
    console.error('[/api/vistoria/upload]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível salvar o arquivo. Tente de novo.' }, { status: 500 })
  }
}
