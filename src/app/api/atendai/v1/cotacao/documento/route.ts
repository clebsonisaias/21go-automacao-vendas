import { NextRequest } from 'next/server'
import { autorizarAtendai, chaveTelefone, json } from '@/lib/atendai'
import { cotacaoDoChat, limparPlaca, PLACA } from '@/lib/atendai-cotacao'
import { extractDocumentWithAi } from '@/lib/document-ai'
import { leituraConfiavel } from '@/lib/documentos'
import { limitePorChave, rateLimit } from '@/lib/rate-limit'
import { MAX_FILE_BYTES, sniffType } from '@/lib/vistoria-files'

export const dynamic = 'force-dynamic'

const sim = (v: FormDataEntryValue | null) => v === 'true' || v === '1'

const NAO_LEU =
  'Não consegui ler a placa nesta foto. Peça ao cliente uma foto mais nítida do documento do carro (CRLV), sem reflexo e com a placa aparecendo, ou que digite a placa.'

/**
 * POST multipart { telefone, arquivo, usoApp?, leilao?, uf? } → cotação a partir da foto ou PDF do
 * documento do carro (CRLV): a IA do site lê a placa e a cotação segue igual à da placa digitada.
 *
 * O arquivo não é gravado e a resposta não traz o dono nem o CPF do documento (o carro pode
 * ser de outra pessoa): só a placa lida e a cotação. O telefone é o da conversa, para o freio
 * por cliente.
 */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-cotacao-doc', 60, 10 * 60 * 1000)) {
    return json({ erro: 'Muitas cotações seguidas. Tente de novo em alguns minutos.' }, 429)
  }
  if (Number(req.headers.get('content-length') || 0) > MAX_FILE_BYTES + 64 * 1024) {
    return json({ erro: 'Arquivo acima de 12 MB. Peça uma foto menor do documento.' }, 413)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }
  const chave = chaveTelefone(String(form.get('telefone') ?? '').replace(/\D/g, '').slice(0, 15))
  if (!chave) return json({ erro: 'Telefone inválido.' }, 400)
  // Cada foto é uma leitura de IA: freio por cliente.
  if (!limitePorChave('atendai-cotacao-doc-tel', chave, 8, 10 * 60 * 1000)) {
    return json({ erro: 'Muitas fotos seguidas. Peça para o cliente digitar a placa ou tentar de novo em alguns minutos.' }, 429)
  }

  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File)) return json({ erro: 'Nenhum arquivo recebido.' }, 400)
  if (arquivo.size === 0 || arquivo.size > MAX_FILE_BYTES) {
    return json({ erro: 'Arquivo vazio ou acima de 12 MB. Peça uma foto menor do documento.' }, 413)
  }
  const buf = Buffer.from(await arquivo.arrayBuffer())
  const tipo = sniffType(buf)
  if (!tipo) return json({ erro: 'O arquivo não é foto nem PDF. Peça uma foto (JPG ou PNG) ou o PDF do documento do carro.' }, 415)

  let placa = ''
  try {
    const leitura = await extractDocumentWithAi({ imageBase64: buf.toString('base64'), mimeType: tipo.mime, docTypeHint: 'crlv' })
    // Sem nenhuma IA respondendo, a leitura volta "simulada": é falha nossa, não foto ruim.
    if (leitura.model === 'simulation') {
      return json({ erro: 'Não consegui ler o documento agora. Peça para o cliente digitar a placa ou mandar a foto de novo em alguns minutos.' }, 503)
    }
    if (leituraConfiavel(leitura)) {
      if (leitura.documentType === 'cnh' || leitura.documentType === 'comprovante_residencia') {
        return json(
          {
            erro: `Essa foto parece ser ${leitura.documentType === 'cnh' ? 'da CNH' : 'de um comprovante de residência'}. Para cotar, peça a foto do documento do carro (CRLV) ou a placa.`,
          },
          422
        )
      }
      placa = limparPlaca(leitura.vehicle?.placa)
    }
  } catch (err) {
    console.warn('[atendai] leitura do CRLV para cotação falhou:', err instanceof Error ? err.message : err)
    return json({ erro: 'Não consegui ler o documento agora. Peça para o cliente digitar a placa ou mandar a foto de novo em instantes.' }, 502)
  }
  if (!PLACA.test(placa)) return json({ erro: NAO_LEU }, 422)

  const r = await cotacaoDoChat({
    placa,
    usoApp: sim(form.get('usoApp')),
    leilao: sim(form.get('leilao')),
    modelo: '',
    uf: String(form.get('uf') ?? '').slice(0, 40),
    telefone: String(form.get('telefone') ?? ''),
  })
  return json({ placaLida: placa, ...r.corpo }, r.status)
}
