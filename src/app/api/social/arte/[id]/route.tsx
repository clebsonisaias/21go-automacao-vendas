import fs from 'fs'
import path from 'path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { contentById } from '@/lib/social-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let logoData = ''
function logo(): string {
  if (!logoData) {
    try {
      const file = path.join(process.cwd(), 'public/brand/logo-21go.png')
      logoData = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`
    } catch {
      logoData = ''
    }
  }
  return logoData
}

/**
 * Arte do post em JPEG (formato exigido pela API do Instagram). Pública: a Meta baixa por URL.
 * Feed 1080×1350; story 1080×1920 (?formato=story) com o texto fora da área dos botões do app
 * (250 px em cima, 420 px embaixo, 160 px à direita).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = contentById(id)
  if (!c) return new Response('Não encontrado', { status: 404 })

  const story = new URL(req.url).searchParams.get('formato') === 'story'

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

  const width = 1080
  const height = story ? 1920 : 1350
  const pad = story
    ? { top: 250, bottom: 420, left: 88, right: 160 }
    : { top: 88, bottom: 88, left: 88, right: 88 }

  const png = new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b1230',
          paddingTop: pad.top,
          paddingBottom: pad.bottom,
          paddingLeft: pad.left,
          paddingRight: pad.right,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* Logo oficial (484 × 219, texto branco): já traz "21 Go! Proteção Veicular". */}
          {logo() ? (
            <img src={logo()} width={274} height={124} alt="" />
          ) : (
            <span style={{ color: '#ffffff', fontSize: 40, fontWeight: 700 }}>21Go Proteção Veicular</span>
          )}
          <span style={{ color: '#c9d1e6', fontSize: 28, borderLeft: '2px solid #26346a', paddingLeft: 28 }}>
            Franquia CITmax
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <span style={{ color: '#f2911d', fontSize: 34, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
            {c.kicker}
          </span>
          <span style={{ color: '#ffffff', fontSize: story ? 100 : 92, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>
            {c.title}
          </span>
          <span style={{ color: '#c9d1e6', fontSize: 42, lineHeight: 1.35 }}>{c.body}</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: story ? 'column' : 'row',
            alignItems: story ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 28,
            borderTop: '2px solid #26346a',
            paddingTop: 40,
          }}
        >
          <span style={{ color: '#ffffff', fontSize: 38, fontWeight: 700 }}>21go.seg.br</span>
          <span
            style={{
              background: '#f2911d',
              color: '#0b1230',
              fontSize: 34,
              fontWeight: 700,
              padding: '18px 36px',
              borderRadius: 16,
            }}
          >
            {story ? 'Faça sua cotação grátis' : 'Cotação pelo link da bio'}
          </span>
        </div>
      </div>
    ),
    { width, height }
  )

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer()
  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
  })
}
