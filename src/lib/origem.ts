/**
 * De onde veio cada cliente (pedido do Clebson, 25/11/2026, ideia do Grok: "hoje o UTM de todos os
 * leads está vazio"). O navegador guarda a primeira origem da visita (UTM, clique do Google ou do
 * Facebook, indicação ou o site de onde veio) e manda no cadastro; o servidor limpa, grava no lead
 * e repassa ao CRM em `utmParameters`. Nada de dado pessoal: só parâmetros de campanha e o domínio.
 *
 * Funções puras, sem imports (testadas com `node --test`).
 */

export type Canal = 'Instagram' | 'Facebook' | 'Google' | 'WhatsApp' | 'Indicação' | 'Direto' | 'Outro'

export const CANAIS: Canal[] = ['Instagram', 'Facebook', 'Google', 'WhatsApp', 'Indicação', 'Direto', 'Outro']

export interface OrigemLead {
  canal: Canal
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  /** Só o domínio de onde a pessoa veio (ex.: instagram.com). */
  referrer?: string
  /** Código de indicação do link (?ref= ou ?indicacao=). */
  indicacao?: string
  /** Primeira página da visita, sem parâmetros (ex.: /). */
  entrada?: string
  /** Quando a origem foi registrada (ISO). */
  em?: string
}

const CAMPOS_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

/** Texto curto e seguro: até 80 caracteres, só letras, números e - _ . + espaço / :. */
export function limparTexto(v: unknown, max = 80): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\-_. +/:]/gu, '')
    .trim()
    .slice(0, max)
  return t || undefined
}

function dominio(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase().slice(0, 80) || undefined
  } catch {
    return undefined
  }
}

/** O canal pela fonte do UTM ou pelo domínio de onde a pessoa veio. */
export function canalDe(fonte: string | undefined, dominioRef: string | undefined, temIndicacao: boolean): Canal {
  if (temIndicacao) return 'Indicação'
  const f = (fonte || '').toLowerCase().trim()
  const d = (dominioRef || '').toLowerCase()
  if (/indica|referral/.test(f)) return 'Indicação'
  if (f === 'ig' || f.includes('instagram') || /(^|\.)instagram\.com$/.test(d)) return 'Instagram'
  if (f === 'fb' || f === 'meta' || f.includes('facebook') || /(^|\.)(facebook|fb)\.com$/.test(d)) return 'Facebook'
  if (f.includes('google') || /(^|\.)google\.[a-z.]+$/.test(d)) return 'Google'
  if (f === 'wa' || f.includes('whatsapp') || d === 'wa.me' || /(^|\.)whatsapp\.com$/.test(d)) return 'WhatsApp'
  if (!f && !d) return 'Direto'
  return 'Outro'
}

/**
 * Origem de uma visita pela URL da página e pelo referrer. `dominioDoSite` evita contar a própria
 * 21Go como origem (navegação interna).
 */
export function origemDaVisita(url: string, referrer?: string | null, dominioDoSite = '21go.seg.br'): OrigemLead {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return { canal: 'Direto' }
  }
  const q = u.searchParams
  const o: OrigemLead = { canal: 'Direto' }
  for (const c of CAMPOS_UTM) {
    const v = limparTexto(q.get(c))
    if (v) o[c] = v
  }
  // Clique de anúncio sem UTM: o próprio identificador diz a plataforma.
  if (!o.utm_source && q.get('gclid')) o.utm_source = 'google'
  if (!o.utm_source && q.get('fbclid')) o.utm_source = 'facebook'
  const indicacao = limparTexto(q.get('ref') || q.get('indicacao'), 40)
  if (indicacao) o.indicacao = indicacao
  const ref = dominio(referrer)
  if (ref && ref !== dominioDoSite && !ref.endsWith(`.${dominioDoSite}`)) o.referrer = ref
  const entrada = limparTexto(u.pathname, 60)
  if (entrada) o.entrada = entrada
  o.canal = canalDe(o.utm_source, o.referrer, Boolean(o.indicacao))
  return o
}

/** Confere a origem que veio do navegador: só os campos conhecidos, limpos. Inválida → undefined. */
export function limparOrigem(bruta: unknown): OrigemLead | undefined {
  if (!bruta || typeof bruta !== 'object') return undefined
  const b = bruta as Record<string, unknown>
  const o: OrigemLead = { canal: 'Direto' }
  for (const c of CAMPOS_UTM) {
    const v = limparTexto(b[c])
    if (v) o[c] = v
  }
  const ref = limparTexto(b.referrer)
  if (ref && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(ref)) o.referrer = ref.toLowerCase()
  const ind = limparTexto(b.indicacao, 40)
  if (ind) o.indicacao = ind
  const entrada = limparTexto(b.entrada, 60)
  if (entrada && entrada.startsWith('/')) o.entrada = entrada
  const em = typeof b.em === 'string' && !Number.isNaN(Date.parse(b.em)) ? new Date(b.em).toISOString() : undefined
  if (em) o.em = em
  // O canal é recalculado aqui (não confiamos no rótulo que veio do navegador).
  o.canal = canalDe(o.utm_source, o.referrer, Boolean(o.indicacao))
  return o
}

/** Parâmetros de campanha para o CRM (`utmParameters`): só os UTM presentes. */
export function utmParaCrm(o: OrigemLead | undefined): Record<string, string> {
  if (!o) return {}
  const r: Record<string, string> = {}
  for (const c of CAMPOS_UTM) if (o[c]) r[c] = o[c] as string
  if (!r.utm_source && o.canal !== 'Direto') r.utm_source = o.canal.toLowerCase()
  return r
}

/** Linha curta para a observação do CRM e o Telegram: "Origem: Instagram (campanha black)". */
export function descreverOrigem(o: OrigemLead | undefined): string {
  if (!o) return 'Origem: não registrada'
  const det = [o.utm_campaign && `campanha ${o.utm_campaign}`, o.indicacao && `indicação ${o.indicacao}`, o.referrer && `veio de ${o.referrer}`]
    .filter(Boolean)
    .join(', ')
  return `Origem: ${o.canal}${det ? ` (${det})` : ''}`
}
