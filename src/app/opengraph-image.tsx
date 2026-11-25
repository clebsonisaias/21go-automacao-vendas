import fs from 'node:fs'
import path from 'node:path'
import { ImageResponse } from 'next/og'

// Imagem do link compartilhado (WhatsApp, Facebook, Google): 1200×630, gerada na build.
// Sem preço, sem "seguro" e sem marca de carro (mesmas regras das artes).

export const alt = '21Go Proteção Veicular pela CITmax, consultor autorizado: cotação pela placa'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function fonte(peso: 500 | 800) {
  const buf = fs.readFileSync(path.join(process.cwd(), 'public/fonts/inter', `inter-${peso}.woff`))
  return { name: 'Inter', weight: peso, style: 'normal' as const, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer }
}

export default function Image() {
  const logo = fs.readFileSync(path.join(process.cwd(), 'public/brand/logo-21go-consultor.png'))
  const w = logo.readUInt32BE(16)
  const h = logo.readUInt32BE(20)
  const altura = 120
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: '#0b1230',
          color: '#ffffff',
          fontFamily: 'Inter',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${logo.toString('base64')}`} width={Math.round((w / h) * altura)} height={altura} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            Proteção veicular pela placa
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 500, color: '#c9d1e6' }}>
            100% da Tabela FIPE · sem consulta ao SPC/Serasa · vistoria pelo celular
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, fontWeight: 500, color: '#a9b3ca' }}>
          <span>CITmax · consultor autorizado da 21Go</span>
          <span style={{ color: '#f2911d', fontWeight: 800 }}>21go.seg.br</span>
        </div>
      </div>
    ),
    { ...size, fonts: [fonte(500), fonte(800)] }
  )
}
