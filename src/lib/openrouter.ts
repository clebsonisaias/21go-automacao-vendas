/**
 * OpenRouter (https://openrouter.ai): reserva da Luna quando a OpenAI falha ou fica sem crédito.
 *
 * A conta de hoje é a gratuita: só modelos ":free", cerca de 50 pedidos por dia, e quem roda o
 * modelo pode guardar o que recebe. Por isso só a conversa de venda da Luna passa por aqui.
 * Documento de cliente (CNH, CRLV, comprovante) nunca vai ao OpenRouter: a leitura fica em
 * document-ai.ts, só com a OpenAI e o Gemini pago.
 *
 * Variáveis: OPENROUTER_API_KEY (obrigatória), OPENROUTER_MODELS (lista separada por vírgula,
 * na ordem de tentativa) e OPENROUTER_API_URL (só nos testes).
 */

export const MODELOS_GRATUITOS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-31b-it:free',
  // Roteador do próprio OpenRouter: escolhe um gratuito que estiver livre (qualidade varia).
  'openrouter/free',
]

export interface MensagemIa {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function openRouterConfigurado(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

/** Modelos na ordem de tentativa: os de OPENROUTER_MODELS ou, sem ela, os gratuitos acima. */
export function modelosOpenRouter(lista: string | undefined = process.env.OPENROUTER_MODELS): string[] {
  const modelos = (lista || '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => /^[\w.-]+\/[\w.:-]+$/.test(m))
  return modelos.length ? modelos : [...MODELOS_GRATUITOS]
}

/**
 * Texto da resposta. Só o `content`: o raciocínio (`reasoning`) que alguns modelos devolvem
 * costuma vir em inglês e com o rascunho do pensamento, então não vai ao cliente.
 */
export function textoDaResposta(dados: unknown): string {
  const msg = (dados as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
  return typeof msg?.content === 'string' ? msg.content.trim() : ''
}

/** Erros em que adianta tentar outro modelo (limite, modelo lotado ou fora do ar, resposta vazia). */
export function valeTentarOutro(status: number): boolean {
  return status === 408 || status === 429 || status >= 500 || status === 404 || status === 400
}

export async function conversarOpenRouter(
  mensagens: MensagemIa[],
  opcoes: { maxTokens?: number; temperatura?: number; tempoMs?: number; prazoTotalMs?: number } = {}
): Promise<{ texto: string; modelo: string }> {
  const chave = process.env.OPENROUTER_API_KEY
  if (!chave) throw new Error('OPENROUTER_API_KEY não configurada no servidor.')
  const url = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
  const falhas: string[] = []
  // Os gratuitos são lentos (até ~40 s num teste de 24/11/2026): espera por modelo e um teto
  // para a conversa toda, para o cliente não ficar mais de um minuto esperando.
  const fim = Date.now() + (opcoes.prazoTotalMs ?? 60_000)

  for (const modelo of modelosOpenRouter()) {
    const resta = fim - Date.now()
    if (resta < 3_000) {
      falhas.push('sem tempo para outro modelo')
      break
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://21go.seg.br',
          'X-Title': '21Go CITmax',
        },
        body: JSON.stringify({
          model: modelo,
          messages: mensagens,
          max_tokens: opcoes.maxTokens ?? 1200,
          temperature: opcoes.temperatura ?? 0.7,
          // Pensar pouco gasta menos tokens e deixa a resposta chegar antes; o raciocínio não volta.
          reasoning: { effort: 'low', exclude: true },
        }),
        signal: AbortSignal.timeout(Math.min(opcoes.tempoMs ?? 45_000, resta)),
      })
      if (res.ok) {
        const texto = textoDaResposta(await res.json())
        if (texto) return { texto, modelo }
        falhas.push(`${modelo}: resposta vazia`)
        continue
      }
      falhas.push(`${modelo}: HTTP ${res.status}`)
      // Chave recusada ou sem saldo: outro modelo não resolve.
      if (!valeTentarOutro(res.status)) break
    } catch (err) {
      falhas.push(`${modelo}: ${err instanceof Error ? err.name : 'erro'}`)
    }
  }
  throw new Error(`OpenRouter sem resposta (${falhas.join('; ')})`)
}
