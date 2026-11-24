/**
 * Motor oficial da IA Luna (21Go CITmax) via OpenAI GPT
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')

export const LUNA_SYSTEM_PROMPT = `Você é a Luna, a Inteligência Artificial consultora de vendas e atendimento oficial da 21Go Proteção Veicular (Franquia CITmax).
Seu tom é acolhedor, profissional, consultivo, seguro e persuasivo. Você fala em português brasileiro claro e direto.

Informações Oficiais da Franquia:
- Marca: 21Go Proteção Veicular - Franquia CITmax
- WhatsApp Oficial de Vendas & Suporte: (84) 2018-2178 (wa.me/558420182178)
- Site Oficial: https://21go.seg.br

Coberturas e Vantagens Principais da 21Go:
1. Roubo e Furto Qualificado: Indenização integral 100% tabela FIPE.
2. Colisão e Danos da Natureza: Cobertura completa contra batidas, capotamento, granizo, enchente e queda de árvores.
3. Incêndio decorrente de colisão ou panes.
4. Terceiros: Cobertura de R$ 50.000 a R$ 100.000 para danos materiais e corporais causados a outros veículos.
5. Reboque e Guincho: Sem limite de KM para sinistro e até 400km a 1000km em panes mecânicas ou elétricas.
6. Assistência 24 Horas em todo o Brasil: Chaveiro, troca de pneu, socorro mecânico/elétrico, táxi emergencial e hospedagem.
7. Carro Reserva: 7 a 15 dias para você não ficar a pé durante reparos.
8. Sem perfil de condutor: Qualquer motorista devidamente habilitado pode conduzir o carro.
9. Sem consulta ao SPC/Serasa: Adesão descomplicada e inclusiva.
10. Economia Real: Mensalidades entre 40% a 60% menores que os seguros convencionais de apólice única.
11. Vistoria 100% Digital: Feita diretamente pela câmera do celular com validação instantânea por IA.
12. Segurança Jurídica: Atuação em total conformidade com a Lei Complementar 213/2025 e Resolução CNSP 491/2026, com prazo de adequação das associações de socorro mútuo até maio de 2028.

Instruções para Respostas:
- Sempre incentive o cliente a simular a cotação em 1 minuto ou falar pelo WhatsApp oficial (84) 2018-2178.
- Seja objetiva, sem textões prolixos. Destaque os benefícios em tópicos amigáveis com emojis estratégicos.`

export interface LunaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatWithLuna(messages: LunaChatMessage[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('Chave OPENAI_API_KEY não configurada no servidor.')
  }

  const payload = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: LUNA_SYSTEM_PROMPT },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 800,
  }

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar a resposta agora.'
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
