import { NextRequest, NextResponse } from 'next/server'
import { extractDocumentWithAi } from '@/lib/document-ai'
import { validateExtraction } from '@/lib/document-segmentation'
import { ExtractedDocType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    let imageBase64 = ''
    let mimeType = 'image/jpeg'
    let docTypeHint: ExtractedDocType | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const hint = formData.get('hint') as string | null

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Nenhum arquivo enviado.' },
          { status: 400 }
        )
      }

      mimeType = file.type || 'image/jpeg'
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      imageBase64 = buffer.toString('base64')
      if (hint && ['cnh', 'crlv', 'comprovante_residencia'].includes(hint)) {
        docTypeHint = hint as ExtractedDocType
      }
    } else {
      const body = await req.json().catch(() => ({}))
      imageBase64 = body.imageBase64 || ''
      mimeType = body.mimeType || 'image/jpeg'
      docTypeHint = body.docTypeHint
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Imagem do documento ausente.' },
        { status: 400 }
      )
    }

    // Extração com GPT-4o (melhor custo-benefício para zero-shot)
    const result = await extractDocumentWithAi({
      imageBase64,
      mimeType,
      docTypeHint,
    })

    // Valida campos essenciais
    const validation = validateExtraction(result)

    return NextResponse.json({
      ...result,
      validation: {
        valid: validation.valid,
        missing: validation.missing,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[API /documents/ocr] Erro:', message)
    return NextResponse.json(
      { success: false, error: `Falha no processamento: ${message}` },
      { status: 500 }
    )
  }
}
