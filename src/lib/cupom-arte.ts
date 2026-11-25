import type { SocialContent } from './social-content'
import type { CupomParaCompartilhar } from './cupom-compartilhar'

/**
 * Arte do cupom (caixa Compartilhar da aba Cupons, pedido do Clebson, 25/11/2026): sai no modelo
 * do manual (`arte-instagram.tsx`), em feed e story, para baixar e mandar no WhatsApp. A IA pode
 * escrever o título e o subtítulo (`cupom-arte-ia.ts`); tudo passa por `problemasDoTexto`.
 *
 * Sem preço nem porcentagem na arte (regra do manual): o valor do desconto fica no texto da mensagem.
 */

export type FundoCupom = 'marinho' | 'laranja' | 'claro'

export interface TextosDaArte {
  titulo: string
  destaque?: string
  subtitulo: string
}

const PALAVRAS_COMUNS =
  /^(colaboradores|colaboradoras|funcionários|funcionárias|clientes|amigos|amigas|associados|associadas|alunos|alunas|membros|parceiros|parceiras|servidores|servidoras|sócios|familiares|equipe|time|motoristas|professores|todos)\b/i

function publico(paraQuem: string): string {
  const p = paraQuem.replace(/\s+/g, ' ').trim().slice(0, 60)
  return PALAVRAS_COMUNS.test(p) ? p.charAt(0).toLowerCase() + p.slice(1) : p
}

/** Texto sem a IA: adesão grátis no título quando é 100%; senão, "desconto na adesão" (sem número). */
export function textosPadraoDoCupom(c: Pick<CupomParaCompartilhar, 'tipo' | 'desconto'>, paraQuem = ''): TextosDaArte {
  const gratis = c.tipo === 'percentual' && c.desconto >= 100
  const quem = paraQuem.trim() ? publico(paraQuem) : ''
  return {
    titulo: gratis ? 'Adesão grátis para você' : 'Desconto na adesão para você',
    destaque: gratis ? 'Adesão grátis' : 'Desconto na adesão',
    subtitulo: quem ? `Condição especial para ${quem}.` : 'Condição especial na proteção veicular da 21Go.',
  }
}

/** O post do modelo do manual para o cupom: título, subtítulo e o passo a passo com o código. */
export function conteudoDaArte(codigo: string, t: TextosDaArte, fundo: FundoCupom = 'marinho'): SocialContent {
  return {
    id: `cupom-${codigo.toLowerCase()}`,
    kicker: `Cupom ${codigo}`,
    etiqueta: `CUPOM ${codigo}`,
    title: t.titulo.trim(),
    destaque: t.destaque?.trim() || undefined,
    body: t.subtitulo.trim(),
    subtitulo: t.subtitulo.trim(),
    caption: '',
    fundo,
    miolo: {
      tipo: 'cards',
      numerados: true,
      cards: [
        { titulo: 'Cote pela placa', texto: 'No site 21go.seg.br' },
        // O plano em promoção (tabela regional): pedido do Clebson, 25/11/2026.
        { titulo: 'Escolha o plano VIP', texto: 'Em promoção no RN, PB e CE' },
        { titulo: `Use o cupom ${codigo}`, texto: 'Na taxa de adesão' },
      ],
    },
    botao: 'Cote pela placa',
  }
}

/**
 * O que impede a arte (os limites do modelo e as regras do manual). Vazio = pode gerar.
 * `regrasDoManual` é o `problemasDoTexto` de arte-regras.ts (passado por quem chama, para este
 * arquivo continuar sem imports).
 */
export function problemasDaArte(codigo: string, t: TextosDaArte, regrasDoManual: (c: SocialContent) => string[]): string[] {
  const p: string[] = []
  if (!t.titulo.trim()) p.push('Escreva o título.')
  if (!t.subtitulo.trim()) p.push('Escreva o subtítulo.')
  if (t.subtitulo.trim().length > 110) p.push('O subtítulo passa de 110 caracteres.')
  if (/\p{Extended_Pictographic}/u.test(`${t.titulo} ${t.subtitulo}`)) p.push('A arte não leva emoji.')
  if (p.length) return p
  return regrasDoManual(conteudoDaArte(codigo, t))
}

/** Confere a resposta da IA (JSON). null = resposta inútil. */
export function limparTextosDaIa(bruto: unknown): TextosDaArte | null {
  const o = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as Record<string, unknown>) : {}
  const limpo = (v: unknown, max: number) =>
    typeof v === 'string' ? v.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, max) : ''
  const titulo = limpo(o.titulo, 80)
  const subtitulo = limpo(o.subtitulo, 110)
  const destaque = limpo(o.destaque, 40)
  if (!titulo || !subtitulo) return null
  return { titulo, subtitulo, ...(destaque ? { destaque } : {}) }
}

/** Instruções para a IA escrever o título e o subtítulo da arte do cupom. */
export function promptDaArteDoCupom(c: CupomParaCompartilhar, paraQuem: string, problemasAnteriores: string[] = []): string {
  const gratis = c.tipo === 'percentual' && c.desconto >= 100
  return [
    'Você escreve o texto de uma arte de divulgação da CITmax, franquia da 21Go Proteção Veicular no Rio Grande do Norte.',
    `A arte divulga o cupom ${c.codigo}, que dá ${gratis ? 'adesão grátis (a taxa de adesão sai de graça)' : 'desconto na taxa de adesão'}.`,
    paraQuem.trim() ? `O público é: ${paraQuem.trim()}.` : 'O público é geral.',
    'A arte já mostra o código do cupom e o passo a passo; você escreve só o título e o subtítulo.',
    '',
    'Regras (obrigatórias):',
    '- Título com no máximo 8 palavras, direto e animado, em português do Brasil.',
    '- "destaque": de 1 a 3 palavras seguidas, copiadas do título, que vão em laranja.',
    '- Subtítulo com no máximo 110 caracteres, citando o público quando houver.',
    '- Sem preço, valor em reais, porcentagem ou "a partir de" (o valor vai na mensagem, não na arte).',
    '- Proteção veicular não é seguro: nunca use "seguro" nem cite a SUSEP.',
    '- Sem marca ou modelo de veículo, sem emoji e sem hashtag.',
    '- Não prometa nada além do desconto na adesão.',
    '- Se citar plano, cite o plano VIP (em promoção para quem mora no RN, na Paraíba e no Ceará) e nenhum outro pelo nome.',
    ...(problemasAnteriores.length ? ['', `A versão anterior foi recusada por: ${problemasAnteriores.join(' ')} Corrija.`] : []),
    '',
    'Responda só em JSON: {"titulo": "…", "destaque": "…", "subtitulo": "…"}',
  ].join('\n')
}
