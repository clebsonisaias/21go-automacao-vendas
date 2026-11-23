import fs from 'fs'
import path from 'path'
import { ImageResponse } from 'next/og'
import type { SocialContent } from './social-content'
import { acharDestaque } from './arte-regras'

export { problemasDoTexto } from './arte-regras'

/**
 * Modelo de arte do Instagram no padrão do manual (docs/MANUAL_ARTES_INSTAGRAM.md):
 * logo no canto superior esquerdo, etiqueta à direita, título em Inter 800 com 1 a 3 palavras
 * em laranja, subtítulo, um miolo só (cards, carro ou foto), rodapé com 21go.seg.br e botão.
 * Feed 1080×1350 com margem de 80 px; story 1080×1920 com 250 px livres em cima e 320 embaixo.
 *
 * Arte pronta exportada (public/social/<feed|story>/<id>.jpg) tem prioridade na rota; este modelo
 * desenha os posts que não têm arte pronta.
 */

export type FormatoArte = 'feed' | 'story'
export type FundoArte = 'marinho' | 'laranja' | 'claro'

const COR = {
  m900: '#0B1230',
  m800: '#111B45',
  m600: '#22337A',
  m400: '#3B52A8',
  laranja: '#F2911D',
  lima: '#C7D301',
  claro: '#F1F4FA',
  gelo: '#C9D1E6',
  cinza: '#5B6785',
  branco: '#FFFFFF',
  roda: '#070C22',
}

const LARGURA = 1080
const MARGEM = 80

/* ------------------------------------------------------------------------- */
/* Arquivos: fonte Inter e logo (lidos uma vez).                              */
/* ------------------------------------------------------------------------- */

type Fonte = { name: string; data: ArrayBuffer; weight: 500 | 600 | 700 | 800; style: 'normal' }
let fontes: Fonte[] | null = null
function carregarFontes(): Fonte[] {
  if (!fontes) {
    fontes = ([500, 600, 700, 800] as const).map((weight) => {
      const buf = fs.readFileSync(path.join(process.cwd(), 'public/fonts/inter', `inter-${weight}.woff`))
      return { name: 'Inter', weight, style: 'normal' as const, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer }
    })
  }
  return fontes
}

let logo: { uri: string; w: number; h: number } | null = null
function carregarLogo() {
  if (!logo) {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public/brand/logo-21go.png'))
    // Largura e altura no cabeçalho IHDR do PNG.
    logo = { uri: `data:image/png;base64,${buf.toString('base64')}`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  }
  return logo
}

function fotoUri(arquivo: string): string | null {
  if (!/^[a-z0-9][a-z0-9._-]*\.(jpe?g|png)$/i.test(arquivo)) return null
  const p = path.join(process.cwd(), 'public/social/fotos', arquivo)
  if (!fs.existsSync(p)) return null
  const tipo = /\.png$/i.test(arquivo) ? 'image/png' : 'image/jpeg'
  return `data:${tipo};base64,${fs.readFileSync(p).toString('base64')}`
}

/** Carro plano, sem marca nem modelo (manual, seção 05). */
const CARRO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="250" viewBox="0 0 780 250">
<path d="M40 172 Q40 132 82 124 L196 104 Q256 40 344 34 L470 34 Q542 36 604 98 L702 112 Q746 120 748 162 L748 182 Q748 196 734 196 L56 196 Q40 196 40 182 Z" fill="${COR.branco}"/>
<path d="M238 104 Q284 56 344 50 L398 50 L398 104 Z" fill="${COR.m600}"/>
<path d="M418 50 L468 50 Q522 52 568 104 L418 104 Z" fill="${COR.m600}"/>
<rect x="714" y="130" width="32" height="16" rx="6" fill="${COR.lima}"/>
<rect x="40" y="136" width="22" height="16" rx="5" fill="${COR.laranja}"/>
<circle cx="192" cy="196" r="46" fill="${COR.roda}"/><circle cx="192" cy="196" r="18" fill="${COR.gelo}"/>
<circle cx="600" cy="196" r="46" fill="${COR.roda}"/><circle cx="600" cy="196" r="18" fill="${COR.gelo}"/>
</svg>`
const CARRO_URI = `data:image/svg+xml;base64,${Buffer.from(CARRO_SVG).toString('base64')}`

/* ------------------------------------------------------------------------- */
/* Desenho.                                                                   */
/* ------------------------------------------------------------------------- */

/** Fundo do post: o escolhido, ou um dos três alternando pelo id (a grade fica variada). */
export function fundoDoPost(c: SocialContent): FundoArte {
  if (c.fundo) return c.fundo
  const soma = [...c.id].reduce((s, ch) => s + ch.charCodeAt(0), 0)
  return (['marinho', 'laranja', 'claro'] as const)[soma % 3]
}

export function arteInstagram(c: SocialContent, formato: FormatoArte): ImageResponse {
  const story = formato === 'story'
  const altura = story ? 1920 : 1350
  const fundo = fundoDoPost(c)
  const naoMarinho = fundo !== 'marinho'
  const corTitulo = fundo === 'marinho' ? COR.branco : COR.m900
  const corDestaque = fundo === 'laranja' ? COR.m900 : COR.laranja
  const corSub = fundo === 'marinho' ? COR.gelo : fundo === 'laranja' ? COR.m900 : COR.cinza
  const corRodape = fundo === 'marinho' ? COR.branco : COR.m900
  const botao =
    fundo === 'marinho'
      ? { bg: COR.branco, fg: COR.m900 }
      : fundo === 'laranja'
        ? { bg: COR.m900, fg: COR.branco }
        : { bg: COR.laranja, fg: COR.m900 }
  const lg = carregarLogo()
  const larguraLogo = naoMarinho ? 270 : 310
  const alturaLogo = Math.round((lg.h * larguraLogo) / lg.w)

  const palavras = c.title.trim().split(/\s+/)
  const destaque = c.destaque ? acharDestaque(palavras, c.destaque) : null
  const impacto = palavras.length <= 2
  const tamTitulo = impacto ? 150 : 96
  const etiqueta = (c.etiqueta ?? c.kicker).toUpperCase()
  const subtitulo = c.subtitulo ?? c.body
  const miolo = c.miolo ?? { tipo: 'carro' as const }
  const gapCards = story ? 24 : 18

  // Anel: um só, no canto de cima à direita, atrás da etiqueta e longe do título.
  const anel = 560
  const corAnel = fundo === 'laranja' ? 'rgba(11, 18, 48, 0.14)' : COR.laranja

  const fundoCss =
    fundo === 'marinho'
      ? { backgroundColor: COR.m900, backgroundImage: `radial-gradient(circle at 25% 15%, ${COR.m600} 0%, ${COR.m800} 55%, ${COR.m900} 100%)` }
      : { backgroundColor: fundo === 'laranja' ? COR.laranja : COR.claro }

  const foto = miolo.tipo === 'foto' ? fotoUri(miolo.arquivo) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: LARGURA,
          height: altura,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'Inter',
          paddingTop: story ? 250 : MARGEM,
          paddingBottom: story ? 320 : MARGEM,
          paddingLeft: MARGEM,
          paddingRight: MARGEM,
          ...fundoCss,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: anel,
            height: anel,
            // No story, o anel fica todo na faixa livre de cima (250 px), longe da etiqueta.
            top: story ? -anel / 2 - 30 : -anel / 2 + 40,
            right: -anel / 2 + 40,
            borderRadius: anel,
            border: `80px solid ${corAnel}`,
          }}
        />

        {/* 1. Topo: logo à esquerda, etiqueta à direita */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {naoMarinho ? (
            <div style={{ display: 'flex', backgroundColor: COR.m900, borderRadius: 22, padding: '18px 24px' }}>
              <img src={lg.uri} width={larguraLogo} height={alturaLogo} alt="" />
            </div>
          ) : (
            <img src={lg.uri} width={larguraLogo} height={alturaLogo} alt="" />
          )}
          <div
            style={{
              display: 'flex',
              backgroundColor: fundo === 'marinho' ? COR.m800 : COR.m900,
              border: fundo === 'marinho' ? `2px solid ${COR.m400}` : 'none',
              borderRadius: 999,
              padding: '14px 26px',
              color: COR.branco,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2.5,
            }}
          >
            {etiqueta}
          </div>
        </div>

        {/* 2. Título e subtítulo */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 96 : 64 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: LARGURA - 2 * MARGEM }}>
            {palavras.map((p, i) => (
              <span
                key={i}
                style={{
                  fontSize: tamTitulo,
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: -3,
                  color: destaque && i >= destaque[0] && i <= destaque[1] ? corDestaque : corTitulo,
                  marginRight: i < palavras.length - 1 ? tamTitulo * 0.24 : 0,
                }}
              >
                {p}
              </span>
            ))}
          </div>
          {subtitulo && (
            <div style={{ display: 'flex', marginTop: 28, maxWidth: 800, fontSize: 44, fontWeight: 600, lineHeight: 1.25, color: corSub }}>
              {subtitulo}
            </div>
          )}
        </div>

        {/* 3. Miolo: um recurso só */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', marginTop: 40, marginBottom: 40 }}>
          {miolo.tipo === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: gapCards }}>
              {miolo.cards.map((k, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 26,
                    backgroundColor: COR.m900,
                    borderRadius: 22,
                    padding: '26px 32px',
                  }}
                >
                  {miolo.numerados ? (
                    <span style={{ fontSize: 48, fontWeight: 800, color: COR.laranja, letterSpacing: -1 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', width: 22, height: 22, borderRadius: 22, backgroundColor: COR.lima, flexShrink: 0 }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 1 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: COR.branco, lineHeight: 1.15 }}>{k.titulo}</span>
                    {k.texto && <span style={{ fontSize: 28, fontWeight: 500, color: COR.gelo, lineHeight: 1.3 }}>{k.texto}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {miolo.tipo === 'carro' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={CARRO_URI} width={780} height={250} alt="" />
            </div>
          )}
          {miolo.tipo === 'foto' && foto && (
            <img src={foto} width={LARGURA - 2 * MARGEM} height={story ? 640 : 420} style={{ objectFit: 'cover', borderRadius: 22 }} alt="" />
          )}
          {c.observacao && (
            <div style={{ display: 'flex', marginTop: 22, fontSize: 28, fontWeight: 600, color: corSub, lineHeight: 1.3 }}>{c.observacao}</div>
          )}
        </div>

        {/* 4. Rodapé: site à esquerda, botão à direita */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 33, fontWeight: 700, color: corRodape }}>21go.seg.br</span>
          <div
            style={{
              display: 'flex',
              backgroundColor: botao.bg,
              color: botao.fg,
              fontSize: 28,
              fontWeight: 800,
              padding: '18px 30px',
              borderRadius: 12,
            }}
          >
            {c.botao ?? 'Cote pela placa'}
          </div>
        </div>
      </div>
    ),
    { width: LARGURA, height: altura, fonts: carregarFontes() }
  )
}
