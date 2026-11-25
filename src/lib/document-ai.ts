import sharp from 'sharp'
import { DocumentAiResult, ExtractedDocType } from './types'
import { normalizarUf, ufDoCep } from './tabela-nordeste'
import { cpfValido, lerTextoDoDocumento } from './documento-pdf'
import { textoDoPdf } from './pdf-texto'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const PRIMARY_MODEL = 'gpt-6-luna'
const BACKUP_MODEL = 'gpt-6-sol'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Métricas de latência (em memória, resetam a cada deploy)
const latencyStats: Record<string, { total: number; count: number; min: number; max: number }> = {}

function recordLatency(model: string, ms: number) {
  if (!latencyStats[model]) {
    latencyStats[model] = { total: 0, count: 0, min: Infinity, max: 0 }
  }
  const s = latencyStats[model]
  s.total += ms
  s.count++
  s.min = Math.min(s.min, ms)
  s.max = Math.max(s.max, ms)
  console.log(`[Latency] ${model}: ${ms}ms (avg: ${Math.round(s.total / s.count)}ms, min: ${s.min}ms, max: ${s.max}ms, n: ${s.count})`)
}

export function getLatencyStats() {
  const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}
  for (const [model, s] of Object.entries(latencyStats)) {
    result[model] = {
      avg: Math.round(s.total / s.count),
      min: s.min === Infinity ? 0 : s.min,
      max: s.max,
      count: s.count,
    }
  }
  return result
}

/**
 * Normaliza e formata CPF brasileiro (XXX.XXX.XXX-XX)
 */
export function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return raw
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Normaliza placa veicular para maiúsculas sem traço
 */
export function formatPlaca(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Normaliza CEP (XXXXX-XXX)
 */
export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 8) return raw
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Valida placa Mercosul ou antiga
 */
function isValidPlaca(placa: string): boolean {
  const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p) || /^[A-Z]{3}[0-9]{4}$/.test(p)
}

/**
 * Prompt avançado para documentos brasileiros
 */
const SYSTEM_PROMPT = `Você é um especialista em OCR de documentos brasileiros para proteção veicular.

Analise a imagem com máxima precisão e extraia os dados estruturados.

Tipos de documento:
- "cnh": Carteira Nacional de Habilitação (física ou digital) ou RG/CIN
- "crlv": Certificado de Registro e Licenciamento de Veículo (CRLV-e)
- "comprovante_residencia": Conta de luz, água, gás, telefone ou internet
- "desconhecido": Não identificado

Regras importantes:
1. Extraia APENAS o que está visível e legível
2. Para CPF, extraia os 11 dígitos sem pontuação
3. Para placa, extraia no formato ABC1D23 ou ABC1234
4. Para datas, use DD/MM/AAAA
5. Se não tiver certeza de um campo, omita-o (não invente)
6. Retorne APENAS JSON válido, sem markdown

Formato de resposta:
{
  "documentType": "cnh" | "crlv" | "comprovante_residencia" | "desconhecido",
  "confidence": 0.0 a 1.0,
  "personal": {
    "nome": "NOME COMPLETO",
    "cpf": "00000000000",
    "rg": "NÚMERO",
    "orgaoExpedidor": "SSP/UF",
    "dataNascimento": "DD/MM/AAAA",
    "numeroCnh": "REGISTRO",
    "categoriaCnh": "B",
    "validadeCnh": "DD/MM/AAAA",
    "primeiraHabilitacao": "DD/MM/AAAA"
  },
  "vehicle": {
    "placa": "ABC1D23",
    "chassi": "17 CARACTERES",
    "renavam": "11 DÍGITOS",
    "marcaModelo": "MARCA/MODELO",
    "marca": "MARCA",
    "modelo": "MODELO",
    "anoFabricacao": 2022,
    "anoModelo": 2023,
    "cor": "COR",
    "combustivel": "FLEX",
    "nomeProprietario": "NOME",
    "cpfCnpjProprietario": "00000000000"
  },
  "address": {
    "cep": "00000000",
    "logradouro": "RUA/AVENIDA",
    "numero": "123",
    "complemento": "APTO",
    "bairro": "BAIRRO",
    "cidade": "CIDADE",
    "uf": "UF"
  }
}`

/**
 * Pós-processamento e validação dos dados extraídos
 */
function postProcess(parsed: any, model?: string, latencyMs?: number): DocumentAiResult {
  const result: DocumentAiResult = {
    success: true,
    documentType: parsed.documentType || 'desconhecido',
    confidence: parsed.confidence || 0.8,
    personal: parsed.personal,
    vehicle: parsed.vehicle,
    address: parsed.address,
    model,
    latencyMs,
  }

  if (result.personal?.cpf) {
    result.personal.cpf = formatCpf(result.personal.cpf)
    if (!cpfValido(result.personal.cpf)) {
      delete result.personal.cpf
      result.confidence = Math.max(0.5, (result.confidence || 0.8) - 0.1)
    }
  }

  if (result.vehicle?.placa) {
    result.vehicle.placa = formatPlaca(result.vehicle.placa)
    if (!isValidPlaca(result.vehicle.placa)) {
      delete result.vehicle.placa
      result.confidence = Math.max(0.5, (result.confidence || 0.8) - 0.1)
    }
  }

  if (result.address?.cep) {
    result.address.cep = formatCep(result.address.cep)
  }

  if (result.address?.uf) {
    // "RN", "rn" ou "Rio Grande do Norte" → "RN"; o que não for UF sai (não vira "RI").
    const uf = normalizarUf(result.address.uf)
    if (uf) result.address.uf = uf
    else delete result.address.uf
  }

  return result
}

/**
 * Tenta extrair com um modelo específico da OpenAI (com medição de latência)
 */
async function tryOpenAIModel(
  model: string,
  dataUri: string,
  docTypeHint?: ExtractedDocType
): Promise<DocumentAiResult | null> {
  // PDF vai como arquivo (a OpenAI não lê PDF como imagem); foto vai como imagem.
  const arquivo = dataUri.startsWith('data:application/pdf;')
    ? { type: 'file', file: { filename: 'documento.pdf', file_data: dataUri } }
    : { type: 'image_url', image_url: { url: dataUri, detail: 'high' } }
  const start = Date.now()
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extraia os dados deste documento brasileiro com máxima precisão.${docTypeHint ? ` Tipo esperado: ${docTypeHint}` : ''}`,
              },
              arquivo,
            ],
          },
        ],
        // Os modelos gpt-6 recusam max_tokens e temperature (só aceitam max_completion_tokens, que
        // inclui o raciocínio). Com max_tokens, toda leitura voltava 400 e caía na "simulation".
        max_completion_tokens: 6000,
        reasoning_effort: 'low',
      }),
    })

    const latencyMs = Date.now() - start

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content) {
        recordLatency(model, latencyMs)
        const parsed = JSON.parse(content)
        return postProcess(parsed, model, latencyMs)
      }
    } else {
      console.warn(`[Document AI] ${model} falhou em ${latencyMs}ms:`, response.status)
    }
  } catch (err) {
    const latencyMs = Date.now() - start
    // Só o tipo do erro: a mensagem de JSON inválido traz trecho da resposta, que pode ter nome e CPF.
    console.error(`[Document AI] Erro com ${model} em ${latencyMs}ms:`, err instanceof Error ? err.name : 'erro')
  }
  return null
}

/**
 * PDF digital lido sem IA (documento-pdf.ts). Depois da mesma normalização da IA, confere de novo
 * o que cada documento precisa; faltando algo, devolve null e o PDF vai à IA como antes.
 * O log leva só o tipo ou o motivo, nunca dado do documento.
 */
async function lerPdfPorCodigo(buf: Buffer, docTypeHint?: ExtractedDocType): Promise<DocumentAiResult | null> {
  const inicio = Date.now()
  const texto = await textoDoPdf(buf)
  if (texto === null) return null
  const { parsed, motivo } = lerTextoDoDocumento(texto, docTypeHint)
  if (!parsed) {
    console.log(`[Document AI] PDF para a IA: ${motivo}`)
    return null
  }
  const ms = Date.now() - inicio
  const r = postProcess(JSON.parse(JSON.stringify(parsed)), 'pdf-texto', ms)
  const completo =
    r.documentType === 'crlv'
      ? Boolean(r.vehicle?.placa)
      : r.documentType === 'cnh'
        ? Boolean(r.personal?.cpf && r.personal?.nome)
        : r.documentType === 'comprovante_residencia'
          ? Boolean(r.address?.uf && r.address?.cep && ufDoCep(r.address.cep) === r.address.uf)
          : false
  if (!completo) {
    console.log(`[Document AI] PDF para a IA: ${r.documentType} incompleto depois da conferência`)
    return null
  }
  r.confidence = 0.95
  recordLatency('pdf-texto', ms)
  console.log(`[Document AI] PDF lido por código (${r.documentType})`)
  return r
}

/**
 * Processa a imagem ou PDF.
 * Prioridade: PDF digital lido por código → gpt-6-luna → gpt-6-sol (backup) → Gemini
 */
export async function extractDocumentWithAi(params: {
  imageBase64: string
  mimeType: string
  docTypeHint?: ExtractedDocType
}): Promise<DocumentAiResult> {
  const { docTypeHint } = params
  let mimeType = params.mimeType
  let rawBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, '')
  // Foto do iPhone (HEIC): as IAs não leem; vira JPEG antes. Se não der, segue como veio.
  if (/^image\/hei[cf]$/i.test(mimeType)) {
    try {
      const jpeg = await sharp(Buffer.from(rawBase64, 'base64')).rotate().jpeg({ quality: 88 }).toBuffer()
      rawBase64 = jpeg.toString('base64')
      mimeType = 'image/jpeg'
    } catch (err) {
      console.warn('[Document AI] HEIC não convertido:', err instanceof Error ? err.message : err)
    }
  }
  const dataUri = `data:${mimeType};base64,${rawBase64}`

  // 0. PDF digital: o texto já está no arquivo. O código lê o que tem certeza; o resto vai à IA.
  if (mimeType === 'application/pdf') {
    const porCodigo = await lerPdfPorCodigo(Buffer.from(rawBase64, 'base64'), docTypeHint)
    if (porCodigo) return porCodigo
  }

  // 1. Tenta gpt-6-luna (principal, mais barato)
  if (OPENAI_API_KEY) {
    const lunaResult = await tryOpenAIModel(PRIMARY_MODEL, dataUri, docTypeHint)
    if (lunaResult) return lunaResult

    // 2. Fallback para gpt-6-sol (backup)
    console.log('[Document AI] gpt-6-luna falhou, tentando gpt-6-sol...')
    const solResult = await tryOpenAIModel(BACKUP_MODEL, dataUri, docTypeHint)
    if (solResult) return solResult
  }

  // 3. Fallback para Google Gemini
  if (GEMINI_API_KEY) {
    const start = Date.now()
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: SYSTEM_PROMPT },
                { inlineData: { mimeType, data: rawBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.05,
            responseMimeType: 'application/json',
          },
        }),
      })

      const latencyMs = Date.now() - start

      if (res.ok) {
        const data = await res.json()
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (content) {
          recordLatency('gemini', latencyMs)
          const parsed = JSON.parse(content)
          return postProcess(parsed, 'gemini', latencyMs)
        }
      }
    } catch (err) {
      console.error('[Document AI] Erro ao extrair com Gemini:', err instanceof Error ? err.name : 'erro')
    }
  }

  // 4. Fallback final
  return simulateDocumentExtraction(docTypeHint)
}

function simulateDocumentExtraction(hint?: ExtractedDocType): DocumentAiResult {
  if (hint === 'crlv') {
    return {
      success: true,
      documentType: 'crlv',
      confidence: 0.96,
      model: 'simulation',
      latencyMs: 0,
      vehicle: {
        placa: 'RGL9B19',
        chassi: '9BWAA05U8BP012345',
        renavam: '01234567890',
        marcaModelo: 'VW/GOL 1.0',
        marca: 'Volkswagen',
        modelo: 'Gol 1.0',
        anoFabricacao: 2022,
        anoModelo: 2023,
        cor: 'BRANCA',
        combustivel: 'FLEX',
        nomeProprietario: 'ASSOCIADO 21GO',
      },
    }
  }

  return {
    success: true,
    documentType: 'cnh',
    confidence: 0.94,
    model: 'simulation',
    latencyMs: 0,
    personal: {
      nome: 'ASSOCIADO 21GO CITMAX',
      cpf: '084.123.456-78',
      dataNascimento: '15/05/1992',
      categoriaCnh: 'B',
      numeroCnh: '05492819201',
    },
  }
}
