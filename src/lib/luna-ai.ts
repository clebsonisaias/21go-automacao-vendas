/**
 * Motor oficial da IA Luna (21Go CITmax): OpenAI GPT e, quando ela falha ou fica sem crédito,
 * a reserva do OpenRouter (src/lib/openrouter.ts, modelos gratuitos).
 */

import { conversarOpenRouter, openRouterConfigurado } from './openrouter'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')

export const LUNA_SYSTEM_PROMPT = `Você é a Luna, a Inteligência Artificial consultora de vendas e atendimento da CITmax, consultor autorizado da 21Go Proteção Veicular. Se perguntarem, diga que a CITmax é consultor autorizado (credenciado) da 21Go: a proteção, os planos e o regulamento são da 21Go.
Seu tom é acolhedor, profissional, consultivo, confiante e persuasivo. Você fala em português brasileiro claro e direto.

Informações da CITmax:
- Marca: 21Go Proteção Veicular - CITmax, consultor autorizado
- WhatsApp Oficial de Vendas & Suporte: (84) 2018-2178 (wa.me/558420182178)
- Site da CITmax: https://21go.seg.br

Coberturas e vantagens da 21Go (o que muda de um plano para outro depende do plano escolhido; os valores só aparecem na cotação pela placa):
1. Roubo, furto e perda total: indenização de 100% da Tabela FIPE.
2. Colisão: reparo em oficinas credenciadas.
3. Fenômenos da natureza: enchente, alagamento, queda de árvore e granizo. Incêndio decorrente de colisão também está coberto.
4. Danos a terceiros: de R$ 5 mil a R$ 100 mil para danos materiais a outros veículos, conforme o plano (Básico R$ 5 mil, Do Seu Jeito R$ 10 mil, VIP R$ 50 mil, Premium R$ 100 mil).
5. Guincho em todo o território nacional: 200 km no Básico, 400 km no Do Seu Jeito, 1.000 km no VIP e 1.400 km no Premium.
6. Assistência 24 horas em todo o Brasil: chaveiro, troca de pneu, pane seca, pane elétrica e recarga de bateria.
7. Carro reserva: 7 dias no VIP (em caso de roubo) e 15 dias no Premium. Os planos Básico e Do Seu Jeito não têm carro reserva.
8. Sem análise de perfil: qualquer condutor habilitado pode dirigir sem afetar a indenização. Motoristas de aplicativo são bem-vindos.
9. Sem consulta ao SPC/Serasa: adesão descomplicada e inclusiva.
10. Desconto de 5% na mensalidade paga em dia. Para carro, o plano VIP está em promoção para quem mora no RN, na Paraíba e no Ceará.
11. Vistoria digital: fotos pelo celular; a equipe analisa e, com a vistoria aprovada, o Pix da adesão é liberado.

Regras:
- Proteção veicular não é seguro: nunca diga "seguro", "apólice" nem compare preço com seguradora.
- Não invente número, prazo, porcentagem nem lei. Se não souber, diga que confirma pelo WhatsApp.

Instruções para Respostas:
- Sempre incentive o cliente a simular a cotação em 1 minuto ou falar pelo WhatsApp oficial (84) 2018-2178.
- Seja objetiva, sem textões prolixos. Destaque os benefícios em tópicos amigáveis com emojis estratégicos.`

export interface LunaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Só o que o próprio site manda: mensagens do cliente e da Luna, as mais recentes, com tamanho
 * limitado. Uma mensagem "system" vinda do navegador mudaria as regras da Luna, então fica de fora.
 */
export function limparConversa(messages: unknown): LunaChatMessage[] {
  if (!Array.isArray(messages)) return []
  return messages
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        !!m &&
        typeof m === 'object' &&
        ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
        typeof (m as { content?: unknown }).content === 'string' &&
        (m as { content: string }).content.trim() !== ''
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
}

async function chatOpenAI(conversa: LunaChatMessage[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages: conversa, temperature: 0.7, max_tokens: 800 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
  const data = await res.json()
  const texto = data.choices?.[0]?.message?.content
  if (typeof texto !== 'string' || !texto.trim()) throw new Error('OpenAI devolveu resposta vazia')
  return texto
}

export async function chatWithLuna(messages: LunaChatMessage[]): Promise<string> {
  const historico = limparConversa(messages)
  if (!historico.some((m) => m.role === 'user')) throw new Error('Conversa sem mensagem do cliente.')
  const conversa: LunaChatMessage[] = [{ role: 'system', content: LUNA_SYSTEM_PROMPT }, ...historico]

  if (OPENAI_API_KEY) {
    try {
      return await chatOpenAI(conversa)
    } catch (err) {
      if (!openRouterConfigurado()) throw err
      console.warn('[Luna] OpenAI falhou, usando o OpenRouter:', err instanceof Error ? err.message : err)
    }
  }
  if (openRouterConfigurado()) {
    const { texto, modelo } = await conversarOpenRouter(conversa, { maxTokens: 1200, temperatura: 0.7 })
    console.log(`[Luna] respondida pelo OpenRouter (${modelo})`)
    return texto
  }
  throw new Error('Nenhuma IA configurada no servidor (OPENAI_API_KEY ou OPENROUTER_API_KEY).')
}

export async function generateLunaPitch({
  nome,
  veiculo,
  placa,
  mensalidade,
  fipe,
  objecao,
}: {
  nome: string
  veiculo: string
  placa?: string
  mensalidade?: number
  fipe?: number
  objecao?: string
}): Promise<string> {
  const prompt = `Gere uma mensagem personalizada de WhatsApp altamente persuasiva da Luna (21Go CITmax) para o cliente:
- Nome: ${nome}
- Veículo: ${veiculo} ${placa ? `(Placa: ${placa})` : ''}
${mensalidade ? `- Mensalidade estimada: R$ ${mensalidade.toFixed(2)}/mês` : ''}
${fipe ? `- Valor FIPE: R$ ${fipe.toLocaleString('pt-BR')}` : ''}
${objecao ? `- Objeção do cliente a contornar: "${objecao}"` : '- Objetivo: Convidar o associado a enviar a vistoria digital pelo link para ativar a proteção hoje mesmo.'}

Instruções:
- Seja calorosa, natural e humana, como uma especialista falando pelo WhatsApp.
- Inclua emojis adequados.
- Deixe o link para fazer a vistoria: https://21go.seg.br/vistoria
- Assine como "Luna | Consultora 21Go CITmax".`

  return chatWithLuna([{ role: 'user', content: prompt }])
}
