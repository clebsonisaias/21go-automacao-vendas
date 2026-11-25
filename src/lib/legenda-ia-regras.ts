/**
 * Legenda de arte oficial escrita pela IA (botão "Escrever com a IA" da aba Instagram): as
 * instruções e a conferência da resposta. Sem rede e sem imports (testado com `node --test`);
 * a chamada à OpenAI fica em `legenda-ia.ts`.
 *
 * A IA vê a arte, escreve de 1 a 3 frases e aponta o que a arte diz que pode não valer para a
 * CITmax no RN. O código põe a chamada e as hashtags e passa tudo pela regra do manual.
 */

export interface LegendaDaIa {
  texto: string
  alertas: string[]
}

/** Instruções para a IA, com os fatos que o site já afirma (as legendas do rodízio). */
export function promptDaLegenda(fatos: string[], problemasAnteriores: string[] = []): string {
  return [
    'Você escreve legendas de Instagram para a CITmax, consultor autorizado da 21Go Proteção Veicular no Rio Grande do Norte (Natal, Parnamirim e Macaíba).',
    'Você recebe uma arte pronta, feita pela 21Go. Escreva só a abertura da legenda: de 1 a 3 frases curtas, em português do Brasil, tom simples e próximo.',
    '',
    'Regras (obrigatórias):',
    '- Fale do tema da arte, mas só afirme o que está na lista de FATOS abaixo. Se a arte promete algo que não está nos fatos (prazo, plano com nome, número de dias, anos de mercado, valor), não repita.',
    '- Proteção veicular não é seguro: nunca use a palavra "seguro" nem cite a SUSEP.',
    '- Sem preço, "a partir de", porcentagem, marca ou modelo de veículo.',
    '- Sem hashtags, sem link e sem chamada para a cotação (o sistema acrescenta depois).',
    '- Pode usar no máximo 1 emoji.',
    '- Se a legenda falar de plano, cite o plano VIP, que está em promoção para quem mora no RN, na Paraíba e no Ceará (para carro). Não cite outro plano pelo nome, nem o que a arte citar.',
    '',
    'Em "alertas", liste em frases curtas o que a ARTE diz ou mostra que pode não valer para a CITmax no RN, para a equipe conferir antes de publicar:',
    '- outra cidade ou estado (ex.: "20+ anos no Rio");',
    '- plano com nome, prazo, número de dias, valor ou porcentagem;',
    '- marca ou modelo de carro visível;',
    '- data comemorativa que já pode ter passado.',
    'Se não houver nada, devolva a lista vazia.',
    '',
    'FATOS que o site já afirma:',
    ...fatos.map((f) => `- ${f}`),
    ...(problemasAnteriores.length
      ? ['', `A versão anterior foi recusada por: ${problemasAnteriores.join(' ')} Corrija.`]
      : []),
    '',
    'Responda só em JSON: {"texto": "…", "alertas": ["…"]}',
  ].join('\n')
}

const tirarSobras = (t: string, cta: string) =>
  t
    .replace(cta, ' ')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** Confere a resposta da IA. null = resposta inútil (sem texto aproveitável). */
export function limparLegendaDaIa(bruto: unknown, cta = ''): LegendaDaIa | null {
  const o = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as Record<string, unknown>) : {}
  const texto = typeof o.texto === 'string' ? tirarSobras(o.texto, cta) : ''
  if (texto.length < 10 || texto.length > 400) return null
  const alertas = (Array.isArray(o.alertas) ? o.alertas : [])
    .filter((a): a is string => typeof a === 'string')
    .map((a) => a.replace(/\s+/g, ' ').trim().slice(0, 200))
    .filter((a) => a.length >= 5)
    .slice(0, 5)
  return { texto, alertas }
}

/** Legenda completa: o texto da IA, a chamada e as hashtags, como as do rodízio. */
export function montarLegenda(texto: string, cta: string, tags: string): string {
  return `${texto}\n\n${cta}\n\n${tags}`
}
