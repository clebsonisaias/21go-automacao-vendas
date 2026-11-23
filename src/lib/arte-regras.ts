import type { SocialContent } from './social-content'

/**
 * Regra de texto do manual de artes (docs/MANUAL_ARTES_INSTAGRAM.md, seção 06): o que nunca vai
 * na arte. Sem JSX nem next/og, para dar para conferir e testar fora do Next.
 */

const MARCAS =
  /\b(fiat|volkswagen|vw|chevrolet|ford|toyota|honda|hyundai|renault|nissan|jeep|peugeot|citro[eë]n|mitsubishi|kia|bmw|mercedes|audi|yamaha|suzuki|caoa|chery|byd|onix|hb20|corolla|civic|argo|strada|mobi|kwid|palio|celta|prisma|virtus|t-cross|compass|renegade|hilux|ranger|s10|toro|fiorino|tracker|creta|kicks|sandero|logan|saveiro|biz|titan|pcx)\b/i

/** Textos que aparecem na arte (a legenda fica de fora). */
function textosDaArte(c: SocialContent): string[] {
  const t = [c.title, c.subtitulo ?? c.body, c.etiqueta ?? '', c.observacao ?? '', c.botao ?? '']
  if (c.miolo?.tipo === 'cards') for (const k of c.miolo.cards) t.push(k.titulo, k.texto ?? '')
  return t.filter(Boolean)
}

/** O que fere o manual neste post; vazio se pode virar arte. */
export function problemasDoTexto(c: SocialContent): string[] {
  const p: string[] = []
  const tudo = textosDaArte(c).join(' \n ')
  if (/R\$\s*\d|\d+\s*%|a partir de/i.test(tudo)) p.push('Preço, "a partir de" ou porcentagem não vão na arte.')
  if (/\bseguros?\b|\bsusep\b/i.test(tudo)) p.push('A arte não chama o produto de "seguro" nem cita a SUSEP.')
  const marca = tudo.match(MARCAS)
  if (marca) p.push(`Marca ou modelo de veículo não vai na arte ("${marca[0]}").`)
  const palavras = c.title.trim().split(/\s+/).filter(Boolean).length
  if (palavras > 8) p.push(`Título com ${palavras} palavras; o manual pede até 8.`)
  if (c.miolo?.tipo === 'cards' && (c.miolo.cards.length < 1 || c.miolo.cards.length > 5)) {
    p.push('Use de 1 a 5 cards.')
  }
  if (c.destaque && !acharDestaque(c.title.split(/\s+/), c.destaque)) {
    p.push(`O destaque "${c.destaque}" não está no título.`)
  }
  return p
}

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()

/** Índices [início, fim] das palavras do título que formam o destaque. */
export function acharDestaque(palavras: string[], destaque: string): [number, number] | null {
  const alvo = destaque.trim().split(/\s+/).map(semAcento)
  const ps = palavras.map(semAcento)
  for (let i = 0; i + alvo.length <= ps.length; i++) {
    if (alvo.every((a, k) => ps[i + k] === a)) return [i, i + alvo.length - 1]
  }
  return null
}

