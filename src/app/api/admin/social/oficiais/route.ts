import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { problemasDaLegenda } from '@/lib/arte-regras'
import { tituloDaArte } from '@/lib/artes-oficiais'
import { listarArtesOficiais, prepararArteOficial } from '@/lib/crm-materiais'
import { igConfigured, invalidateMediaCache, publicarImagem } from '@/lib/instagram'
import { rateLimit } from '@/lib/rate-limit'
import { CTA, TAGS } from '@/lib/social-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → pastas e artes dos Materiais do CRM (a prévia sai por /oficiais/{id}/previa). */
export async function GET(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const atualizar = req.nextUrl.searchParams.get('atualizar') === '1' && rateLimit(req, 'artes-oficiais-atualizar', 10, 10 * 60_000)
  const pastas = await listarArtesOficiais(atualizar)
  if (!pastas) {
    return NextResponse.json({ success: false, error: 'O CRM 21Go não respondeu. Tente de novo em instantes.' }, { status: 503 })
  }
  return NextResponse.json(
    {
      success: true,
      configurado: igConfigured(),
      legendaPadrao: `\n\n${CTA}\n\n${TAGS}`,
      // A URL assinada do CRM fica no servidor: a tela usa a prévia do próprio site.
      pastas: pastas.map((p) => ({ ...p, artes: p.artes.map(({ previa: _u, ...a }) => ({ ...a, titulo: tituloDaArte(a.nome) })) })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/** POST { arteId, formato, legenda, conferido } → publica a arte no feed ou no story, no clique. */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  if (!rateLimit(req, 'artes-oficiais-publicar', 10, 10 * 60_000)) {
    return NextResponse.json({ success: false, error: 'Muitas publicações seguidas. Espere alguns minutos.' }, { status: 429 })
  }
  const body = await req.json().catch(() => null)
  const arteId = typeof body?.arteId === 'string' ? body.arteId : ''
  const formato = body?.formato === 'story' ? 'story' : 'feed'
  const legenda = typeof body?.legenda === 'string' ? body.legenda.replace(/\r\n/g, '\n').trim() : ''
  if (body?.conferido !== true) {
    return NextResponse.json({ success: false, error: 'Confira a arte e marque a caixa antes de publicar.' }, { status: 400 })
  }
  if (formato === 'feed') {
    // A legenda sugerida traz só a chamada e as hashtags: a equipe escreve a frase sobre a arte.
    const fraseNova = legenda
      .split('\n')
      .filter((l: string) => l.trim() && l.trim() !== CTA && l.trim() !== TAGS)
      .join(' ')
      .trim()
    if (fraseNova.length < 10) {
      return NextResponse.json({ success: false, error: 'Escreva a primeira linha da legenda, sobre o que a arte mostra.' }, { status: 400 })
    }
    const problemas = problemasDaLegenda(legenda)
    if (problemas.length) return NextResponse.json({ success: false, error: problemas.join(' ') }, { status: 400 })
  }
  if (!igConfigured()) {
    return NextResponse.json({ success: false, error: 'O Instagram não está ligado no site (IG_USER_ID e IG_ACCESS_TOKEN no Coolify).' }, { status: 409 })
  }
  const preparada = await prepararArteOficial(arteId)
  if ('erro' in preparada) return NextResponse.json({ success: false, error: preparada.erro }, { status: 502 })
  try {
    const r = await publicarImagem({
      contentId: `oficial:${preparada.arte.id}`,
      titulo: `Arte oficial: ${tituloDaArte(preparada.arte.nome)}`,
      imageUrl: preparada.url,
      caption: legenda,
      kind: formato,
    })
    invalidateMediaCache()
    if (r.status !== 'publicado') return NextResponse.json({ success: false, error: r.error || 'A Meta recusou o post.' }, { status: 502 })
    return NextResponse.json({ success: true, post: r })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Não foi possível publicar.' }, { status: 409 })
  }
}
