/**
 * Pedido à OpenAI com resposta em JSON, do jeito da leitura de documentos (document-ai.ts):
 * `gpt-6-luna` e, se falhar ou vier resposta inútil, `gpt-6-sol`. Usado pela legenda das artes
 * oficiais (legenda-ia.ts) e pela arte do cupom (cupom-arte-ia.ts).
 * O log leva só o rótulo, o modelo, o tempo e o status.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const MODELOS = ['gpt-6-luna', 'gpt-6-sol']

export function openAiLigada(): boolean {
  return Boolean(OPENAI_API_KEY)
}

type Conteudo = string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: string } })[]

export async function pedirJsonOpenAI<T>(p: {
  rotulo: string
  sistema: string
  usuario: Conteudo
  validar: (json: unknown) => T | null
  maxTokens?: number
}): Promise<T | null> {
  if (!OPENAI_API_KEY) return null
  for (const modelo of MODELOS) {
    const inicio = Date.now()
    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelo,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: p.sistema },
            { role: 'user', content: p.usuario },
          ],
          // gpt-6: só max_completion_tokens (conta o raciocínio) e sem temperature (400 se mandar).
          max_completion_tokens: p.maxTokens ?? 4000,
          reasoning_effort: 'low',
        }),
        signal: AbortSignal.timeout(45_000),
      })
      const ms = Date.now() - inicio
      if (!res.ok) {
        console.warn(`[${p.rotulo}] ${modelo} respondeu ${res.status} em ${ms}ms`)
        continue
      }
      const data = await res.json()
      const conteudo = data.choices?.[0]?.message?.content
      const r = typeof conteudo === 'string' ? p.validar(JSON.parse(conteudo)) : null
      console.log(`[${p.rotulo}] ${modelo} em ${ms}ms${r ? '' : ' (resposta descartada)'}`)
      if (r) return r
    } catch (e) {
      console.warn(`[${p.rotulo}] ${modelo} falhou em ${Date.now() - inicio}ms:`, e instanceof Error ? e.name : 'erro')
    }
  }
  return null
}
