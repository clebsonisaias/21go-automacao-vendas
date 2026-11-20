import { DocumentAiResult, ExtractedDocType } from './types'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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
 * Prompt especialista em documentos automotivos e cadastrais brasileiros
 */
const SYSTEM_PROMPT = `Você é um motor de IA especialista em OCR e extração estruturada de documentos brasileiros de trânsito e identificação para cotação e vistoria veicular da 21Go Proteção Veicular.

Analise a imagem ou PDF fornecido e identifique se o documento é:
1. "cnh" (Carteira Nacional de Habilitação física ou digital, ou RG/CIN)
2. "crlv" (Certificado de Registro e Licenciamento de Veículo / CRLV-e / Documento do carro ou moto)
3. "comprovante_residencia" (Conta de luz, água, gás, telefone, internet ou fatura de cartão com endereço)
4. "desconhecido" (Não foi possível identificar com clareza)

Retorne ESTRITAMENTE um objeto JSON válido, sem texto adicional, no seguinte formato:
{
  "documentType": "cnh" | "crlv" | "comprovante_residencia" | "desconhecido",
  "confidence": 0.95,
  "personal": {
    "nome": "NOME COMPLETO EM MAIÚSCULAS",
    "cpf": "00000000000",
    "rg": "NÚMERO DO RG",
    "orgaoExpedidor": "SSP/UF",
    "dataNascimento": "DD/MM/AAAA",
    "numeroCnh": "NÚMERO DE REGISTRO",
    "categoriaCnh": "B ou AB ou A etc",
    "validadeCnh": "DD/MM/AAAA",
    "primeiraHabilitacao": "DD/MM/AAAA"
  },
  "vehicle": {
    "placa": "ABC1D23",
    "chassi": "17 CARACTERES DO CHASSI",
    "renavam": "NÚMERO RENAVAM",
    "marcaModelo": "MARCA/MODELO CONFORME CRLV",
    "anoFabricacao": 2022,
    "anoModelo": 2023,
    "cor": "COR PREDOMINANTE",
    "combustivel": "ALCOOL/GASOLINA/FLEX",
    "nomeProprietario": "NOME DO PROPRIETÁRIO NO CRLV",
    "cpfCnpjProprietario": "CPF OU CNPJ DO PROPRIETÁRIO"
  },
  "address": {
    "cep": "00000000",
    "logradouro": "RUA/AVENIDA",
    "numero": "NÚMERO",
    "complemento": "APTO/BLOCO SE HOUVER",
    "bairro": "BAIRRO",
    "cidade": "NOME DA CIDADE",
    "uf": "SIGLA DO ESTADO (ex: RN, SP, RJ, PB)"
  }
}

Regras obrigatórias:
- Se um campo não estiver visível ou legível no documento, preencha como null ou omitir.
- Não invente dados não presentes no documento.
- No CRLV, a placa pode ser formato antigo (ex: ABC1234) ou Mercosul (ex: ABC1D23).
- Chassi sempre tem exatamente 17 caracteres alfanuméricos (sem letras I, O, Q).
`

/**
 * Processa a imagem ou PDF com o Google Gemini API
 */
export async function extractDocumentWithAi(params: {
  imageBase64: string
  mimeType: string
  docTypeHint?: ExtractedDocType
}): Promise<DocumentAiResult> {
  const { imageBase64, mimeType, docTypeHint } = params

  if (!GEMINI_API_KEY) {
    console.warn('[Document AI] GEMINI_API_KEY não configurada. Operando em modo de simulação.')
    return simulateDocumentExtraction(docTypeHint)
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType,
                data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Document AI] Erro retornado pela Gemini API:', res.status, errText)
      return {
        success: false,
        documentType: 'desconhecido',
        confidence: 0,
        error: `Falha ao processar com IA: HTTP ${res.status}`,
      }
    }

    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      return {
        success: false,
        documentType: 'desconhecido',
        confidence: 0,
        error: 'Nenhuma resposta gerada pela IA.',
      }
    }

    const parsed = JSON.parse(content)

    // Formatações auxiliares pós-extração
    if (parsed.personal?.cpf) parsed.personal.cpf = formatCpf(parsed.personal.cpf)
    if (parsed.vehicle?.placa) parsed.vehicle.placa = formatPlaca(parsed.vehicle.placa)
    if (parsed.address?.cep) parsed.address.cep = formatCep(parsed.address.cep)

    return {
      success: true,
      documentType: parsed.documentType || 'desconhecido',
      confidence: parsed.confidence || 0.9,
      personal: parsed.personal,
      vehicle: parsed.vehicle,
      address: parsed.address,
      rawText: content,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Document AI] Exceção durante a extração:', message)
    return {
      success: false,
      documentType: 'desconhecido',
      confidence: 0,
      error: `Erro de processamento: ${message}`,
    }
  }
}

/**
 * Simulação inteligente caso GEMINI_API_KEY ainda não esteja configurada no ambiente
 */
function simulateDocumentExtraction(hint?: ExtractedDocType): DocumentAiResult {
  if (hint === 'crlv') {
    return {
      success: true,
      documentType: 'crlv',
      confidence: 0.96,
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
        nomeProprietario: 'CHRISTIAN ARAUJO PINHEIRO DE LUCENA',
      },
    }
  }

  return {
    success: true,
    documentType: 'cnh',
    confidence: 0.94,
    personal: {
      nome: 'CHRISTIAN ARAUJO PINHEIRO DE LUCENA',
      cpf: '084.***.***-62',
      dataNascimento: '15/05/1992',
      categoriaCnh: 'B',
      numeroCnh: '05492819201',
    },
  }
}
