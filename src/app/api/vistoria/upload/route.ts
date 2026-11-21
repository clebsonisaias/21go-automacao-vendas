import { NextRequest, NextResponse } from 'next/server'
import { findLeadByRef, updateLead } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { MAX_FILE_BYTES, VISTORIA_SLOTS, isVistoriaSlot, saveVistoriaFile, sniffType } from '@/lib/vistoria-files'

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
    if (lead.status === 'cancelado') {
      return NextResponse.json({ error: 'Este cadastro foi encerrado. Faça uma nova cotação ou fale com a nossa equipe.' }, { status: 410 })
    }
    if (lead.status === 'aprovado') {
      return NextResponse.json({ error: 'Esta vistoria já foi aprovada. Fale com a nossa equipe para alterar.' }, { status: 409 })
    }
    if (!isVistoriaSlot(slot) || !(file instanceof File)) {
      return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Arquivo vazio ou acima de 12 MB. Envie uma foto menor.' }, { status: 413 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const type = sniffType(buf)
    if (!type || (type.ext === 'pdf' && !VISTORIA_SLOTS[slot].pdf)) {
      return NextResponse.json(
        { error: VISTORIA_SLOTS[slot].pdf ? 'Envie uma foto (JPG, PNG) ou PDF.' : 'Envie uma foto (JPG ou PNG).' },
        { status: 415 }
      )
    }

    saveVistoriaFile(lead.id, slot, buf, type.ext)
    updateLead(lead.ref, (l) => {
      l.vistoriaArquivos = {
        ...(l.vistoriaArquivos || {}),
        [slot]: {
          ext: type.ext,
          mime: type.mime,
          size: buf.length,
          originalName: file.name.replace(/[^\w.\- ()]/g, '_').slice(0, 120),
          savedAt: new Date().toISOString(),
        },
      }
    })

    return NextResponse.json({ success: true, slot })
  } catch (err) {
    console.error('[/api/vistoria/upload]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível salvar o arquivo. Tente de novo.' }, { status: 500 })
  }
}
