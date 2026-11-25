import { problemasDaLegenda } from './arte-regras'
import { previaDaArte } from './crm-materiais'
import { limparLegendaDaIa, montarLegenda, promptDaLegenda } from './legenda-ia-regras'
import { openAiLigada, pedirJsonOpenAI } from './openai-json'
import { CTA, TAGS, fatosDoSite } from './social-content'

/**
 * Legenda da arte oficial escrita pela IA, com a imagem da arte (ver legenda-ia-regras.ts).
 * A arte é material de divulgação, sem dado pessoal.
 */

export function legendaIaLigada(): boolean {
  return openAiLigada()
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
    const r = await pedirJsonOpenAI({
      rotulo: 'Legenda IA',
      sistema: promptDaLegenda(fatosDoSite(), problemas),
      usuario: [
        { type: 'text', text: 'Escreva a abertura da legenda para esta arte e liste os alertas.' },
        { type: 'image_url', image_url: { url: imagem, detail: 'high' } },
      ],
      validar: (json) => limparLegendaDaIa(json, CTA),
    })
    if (!r) return { ok: false, status: 502, erro: 'A IA não respondeu. Escreva a legenda à mão ou tente de novo.' }
    const legenda = montarLegenda(r.texto, CTA, TAGS)
    problemas = problemasDaLegenda(legenda)
    if (!problemas.length) return { ok: true, texto: r.texto, legenda, alertas: r.alertas }
  }
  return { ok: false, status: 422, erro: 'A IA escreveu algo fora do manual. Escreva a legenda à mão.' }
}
