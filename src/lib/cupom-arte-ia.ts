import { TextosDaArte, limparTextosDaIa, problemasDaArte, promptDaArteDoCupom, textosPadraoDoCupom } from './cupom-arte'
import type { CupomParaCompartilhar } from './cupom-compartilhar'
import { problemasDoTexto } from './arte-regras'
import { openAiLigada, pedirJsonOpenAI } from './openai-json'

/**
 * Título e subtítulo da arte do cupom escritos pela IA (só texto: código, desconto e público).
 * Se a IA não responder ou ferir o manual duas vezes, volta o texto padrão, com o aviso.
 */
export async function textosDaArteComIa(
  c: CupomParaCompartilhar,
  paraQuem: string
): Promise<{ textos: TextosDaArte; viaIa: boolean; aviso?: string }> {
  const padrao = textosPadraoDoCupom(c, paraQuem)
  if (!openAiLigada()) return { textos: padrao, viaIa: false, aviso: 'A IA não está ligada no site: ficou o texto padrão.' }
  let problemas: string[] = []
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await pedirJsonOpenAI({
      rotulo: 'Arte do cupom IA',
      sistema: promptDaArteDoCupom(c, paraQuem, problemas),
      usuario: 'Escreva o título, o destaque e o subtítulo da arte.',
      validar: limparTextosDaIa,
      temperatura: 0.7,
      maxTokens: 300,
    })
    if (!r) return { textos: padrao, viaIa: false, aviso: 'A IA não respondeu: ficou o texto padrão.' }
    problemas = problemasDaArte(c.codigo, r, problemasDoTexto)
    if (!problemas.length) return { textos: r, viaIa: true }
  }
  return { textos: padrao, viaIa: false, aviso: 'A IA escreveu algo fora do manual: ficou o texto padrão.' }
}
