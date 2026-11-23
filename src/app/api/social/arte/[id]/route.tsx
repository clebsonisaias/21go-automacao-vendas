import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { arteInstagram, problemasDoTexto } from '@/lib/arte-instagram'
import { contentById } from '@/lib/social-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Arte do post em JPEG (formato exigido pela API do Instagram). Pública: a Meta baixa por URL.
 * Feed 1080×1350; story 1080×1920 (?formato=story). Arte pronta primeiro; sem ela, o modelo
 * do manual (src/lib/arte-instagram.tsx). ?png=1 devolve PNG.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = contentById(id)
  if (!c) return new Response('Não encontrado', { status: 404 })

  const url = new URL(req.url)
  const story = url.searchParams.get('formato') === 'story'

  // Se existe arte pronta (exportada do Claude Design) em public/social/<feed|story>/<id>.jpg, serve ela direto.
  if (/^[a-z0-9-]+$/i.test(id)) {
    const readyPath = path.join(process.cwd(), 'public', 'social', story ? 'story' : 'feed', `${id}.jpg`)
    if (fs.existsSync(readyPath)) {
      const jpg = fs.readFileSync(readyPath)
      return new Response(new Uint8Array(jpg), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }
  }

  // Sem arte pronta: o modelo no padrão do manual (docs/MANUAL_ARTES_INSTAGRAM.md).
  const problemas = problemasDoTexto(c)
  if (problemas.length) {
    return Response.json({ erro: 'Este post não segue o manual de artes.', problemas }, { status: 422 })
  }
  const png = Buffer.from(await arteInstagram(c, story ? 'story' : 'feed').arrayBuffer())

  // ?png=1: PNG para baixar (o manual pede PNG); sem ele, JPEG, que é o que a API do Instagram aceita.
  if (url.searchParams.get('png') === '1') {
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    })
  }
  const jpeg = await sharp(png).jpeg({ quality: 92 }).toBuffer()
  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
  })
}
