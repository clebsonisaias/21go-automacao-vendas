import sharp from 'sharp'
import { NextRequest } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { arteInstagram, problemasDoTexto } from '@/lib/arte-instagram'
import { conteudoDaArte, problemasDaArte, type FundoCupom } from '@/lib/cupom-arte'
import { lerCupons } from '@/lib/cupons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Arte do cupom no modelo do manual (só admin). ?titulo, ?destaque, ?subtitulo, ?fundo,
 * ?formato=story; ?baixar=1 devolve o PNG para baixar; sem ele, uma prévia menor em JPEG.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const { id } = await ctx.params
  const cupom = lerCupons().find((c) => c.id === id)
  if (!cupom) return Response.json({ erro: 'Cupom não encontrado.' }, { status: 404 })

  const q = req.nextUrl.searchParams
  const textos = {
    titulo: (q.get('titulo') || '').slice(0, 80),
    destaque: (q.get('destaque') || '').slice(0, 40),
    subtitulo: (q.get('subtitulo') || '').slice(0, 110),
  }
  const problemas = problemasDaArte(cupom.codigo, textos, problemasDoTexto)
  if (problemas.length) return Response.json({ erro: 'A arte não segue o manual.', problemas }, { status: 422 })

  const fundo: FundoCupom = q.get('fundo') === 'laranja' ? 'laranja' : q.get('fundo') === 'claro' ? 'claro' : 'marinho'
  const formato = q.get('formato') === 'story' ? 'story' : 'feed'
  const png = Buffer.from(await arteInstagram(conteudoDaArte(cupom.codigo, textos, fundo), formato).arrayBuffer())

  if (q.get('baixar') === '1') {
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="cupom-${cupom.codigo}-${formato}.png"`,
        'Cache-Control': 'no-store',
      },
    })
  }
  const previa = await sharp(png).resize({ width: 540 }).jpeg({ quality: 85 }).toBuffer()
  return new Response(new Uint8Array(previa), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } })
}
