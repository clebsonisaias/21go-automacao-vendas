import { problemasDaLegenda } from './arte-regras'
import { previaDaArte } from './crm-materiais'
import { LegendaDaIa, limparLegendaDaIa, montarLegenda, promptDaLegenda } from './legenda-ia-regras'
import { CTA, TAGS, fatosDoSite } from './social-content'

/**
 * Chamada à OpenAI com a imagem da arte oficial (ver legenda-ia-regras.ts). Mesmo jeito da leitura
 * de documentos (document-ai.ts): `gpt-6-luna` e, se falhar, `gpt-6-sol`. A arte é material de
 * divulgação, sem dado pessoal. O log leva só o modelo, o tempo e o status.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const MODELOS = ['gpt-6-luna', 'gpt-6-sol']

export function legendaIaLigada(): boolean {
  return Boolean(OPENAI_API_KEY)
}

async function perguntar(modelo: string, imagem: string, prompt: string): Promise<LegendaDaIa | null> {
  const inicio = Date.now()
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Escreva a abertura da legenda para esta arte e liste os alertas.' },
              { type: 'image_url', image_url: { url: imagem, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const ms = Date.now() - inicio
    if (!res.ok) {
      console.warn(`[Legenda IA] ${modelo} respondeu ${res.status} em ${ms}ms`)
      return null
    }
    const data = await res.json()
    const conteudo = data.choices?.[0]?.message?.content
    const r = typeof conteudo === 'string' ? limparLegendaDaIa(JSON.parse(conteudo), CTA) : null
    console.log(`[Legenda IA] ${modelo} em ${ms}ms${r ? '' : ' (resposta descartada)'}`)
    return r
  } catch (e) {
    console.warn(`[Legenda IA] ${modelo} falhou em ${Date.now() - inicio}ms:`, e instanceof Error ? e.name : 'erro')
    return null
  }
}

export type ResultadoLegendaIa =
  | { ok: true; texto: string; legenda: string; alertas: string[] }
  | { ok: false; status: number; erro: string }

/** Escreve a legenda da arte. Se a primeira versão ferir o manual, pede de novo uma vez. */
export async function escreverLegendaDaArte(arteId: string): Promise<ResultadoLegendaIa> {
  if (!legendaIaLigada()) return { ok: false, status: 503, erro: 'A IA não está ligada no site (falta a chave da OpenAI).' }
  const jpg = await previaDaArte(arteId, 1080)
  if (!jpg) return { ok: false, status: 404, erro: 'Não foi possível abrir esta arte. Atualize as artes e tente de novo.' }
  const imagem = `data:image/jpeg;base64,${jpg.toString('base64')}`

  let problemas: string[] = []
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const prompt = promptDaLegenda(fatosDoSite(), problemas)
    let r: LegendaDaIa | null = null
    for (const modelo of MODELOS) {
      r = await perguntar(modelo, imagem, prompt)
      if (r) break
    }
    if (!r) return { ok: false, status: 502, erro: 'A IA não respondeu. Escreva a legenda à mão ou tente de novo.' }
    const legenda = montarLegenda(r.texto, CTA, TAGS)
    problemas = problemasDaLegenda(legenda)
    if (!problemas.length) return { ok: true, texto: r.texto, legenda, alertas: r.alertas }
  }
  return { ok: false, status: 422, erro: 'A IA escreveu algo fora do manual. Escreva a legenda à mão.' }
}
