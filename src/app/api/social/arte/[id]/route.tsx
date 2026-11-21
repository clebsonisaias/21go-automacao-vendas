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

/** Arte do post (1080×1350, JPEG — formato exigido pela API do Instagram). Pública: a Meta baixa por URL. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = contentById(id)
  if (!c) return new Response('Não encontrado', { status: 404 })

  const png = new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1350,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b1230',
          padding: 88,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {logo() ? <img src={logo()} width={112} height={112} style={{ borderRadius: 24 }} alt="" /> : null}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#ffffff', fontSize: 40, fontWeight: 700 }}>21Go CITmax</span>
            <span style={{ color: '#c9d1e6', fontSize: 28 }}>Proteção veicular</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <span style={{ color: '#f2911d', fontSize: 34, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
            {c.kicker}
          </span>
          <span style={{ color: '#ffffff', fontSize: 92, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>
            {c.title}
          </span>
          <span style={{ color: '#c9d1e6', fontSize: 42, lineHeight: 1.35 }}>{c.body}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
            Cotação pelo link da bio
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  )

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer()
  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
  })
}
