import { NextRequest } from 'next/server'
import { autorizarAtendai, cadastroMaisRecente, chaveTelefone, json, situacaoDoCadastro } from '@/lib/atendai'
import { findLeadByRef } from '@/lib/db'
import { extractDocumentWithAi } from '@/lib/document-ai'
import {
  DOCUMENTOS_OBRIGATORIOS,
  aplicarLeitura,
  bloqueioDoCadastro,
  concluirDocumentos,
  hashDoArquivo,
  leituraConfiavel,
  receberArquivo,
} from '@/lib/documentos'
import { limitePorChave } from '@/lib/rate-limit'
import { DocumentAiResult } from '@/lib/types'
import { MAX_FILE_BYTES, sniffType } from '@/lib/vistoria-files'
import { DOCUMENTOS_EM_PDF } from '@/lib/vistoria-slots'
import { guardarComprovanteLido } from '@/lib/regiao-comprovante'

import { conversaNoChat } from '@/lib/cotacao-whatsapp-envio'

export const dynamic = 'force-dynamic'

/**
 * POST multipart { telefone, arquivos[] } → os documentos que o cliente mandou no chat.
 *
 * O mesmo caminho da página /vistoria: a IA do site lê cada arquivo, o tipo lido diz qual
 * documento é (CNH ou RG, CRLV, comprovante de residência), o arquivo é gravado igual ao
 * upload da página e a leitura completa o cadastro. Com os 3 documentos, o envio é
 * concluído (Telegram e link da vistoria no CRM, que faz o card andar).
 *
 * `telefone` é o WhatsApp da conversa, vindo do AtendeHub (nunca do modelo). A resposta
 * não devolve dado lido: só o que chegou, o que falta e o próximo passo.
 */

const MAX_ARQUIVOS = 5

const SLOT_DO_TIPO = {
  cnh: 'cnhOuRg',
  crlv: 'crlv',
  comprovante_residencia: 'comprovanteResidencia',
} as const

const NOME = {
  cnhOuRg: 'CNH ou RG',
  crlv: 'documento do veículo (CRLV)',
  comprovanteResidencia: 'comprovante de residência',
} as const

/** Placa antiga e Mercosul são a mesma: a 5ª posição vira letra (0=A … 9=J). */
function mesmaPlaca(a: string, b: string): boolean {
  const norm = (p: string) => {
    const s = p.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (s.length !== 7) return s
    const c = s[4]
    return c >= 'A' && c <= 'J' ? `${s.slice(0, 4)}${c.charCodeAt(0) - 65}${s.slice(5)}` : s
  }
  return norm(a) === norm(b)
}

/** Um envio por cadastro de cada vez: dois turnos do chat não gravam nem concluem juntos. */
const emAndamento = new Map<string, Promise<unknown>>()

export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado

  const declarado = Number(req.headers.get('content-length') || 0)
  if (declarado > MAX_ARQUIVOS * (MAX_FILE_BYTES + 64 * 1024)) {
    return json({ erro: 'Arquivos grandes demais. Mande até 5 arquivos de 12 MB.' }, 413)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }

  const telefone = String(form.get('telefone') ?? '').replace(/\D/g, '').slice(0, 15)
  conversaNoChat(telefone)
  const chave = chaveTelefone(telefone)
  if (!chave) return json({ erro: 'Telefone inválido.' }, 400)
  if (!limitePorChave('atendai-documentos', chave, 20, 10 * 60 * 1000)) {
    return json({ erro: 'Muitos envios seguidos. Tente de novo em alguns minutos.' }, 429)
  }

  const arquivos = form.getAll('arquivos').filter((f): f is File => f instanceof File)
  if (!arquivos.length) return json({ erro: 'Nenhum arquivo recebido.' }, 400)
  if (arquivos.length > MAX_ARQUIVOS) return json({ erro: 'Mande no máximo 5 arquivos de cada vez.' }, 400)

  const lead = cadastroMaisRecente(telefone)
  if (!lead) {
    return json({ erro: 'Não achei um cadastro deste WhatsApp. Faça a cotação e o cadastro antes de mandar os documentos.' }, 404)
  }

  // Envio já concluído: não grava de novo nem repete os avisos; só diz em que pé está.
  if (lead.vistoriaData?.enviadoEm) {
    const s = situacaoDoCadastro(lead)
    return json({ completo: true, jaEnviado: true, recebidos: [], faltam: [], naoLidos: 0, avisos: [], proximoPasso: s.proximoPasso })
  }
  const bloqueio = bloqueioDoCadastro(lead)
  if (bloqueio) return json({ erro: bloqueio.erro }, bloqueio.status)

  const anterior = emAndamento.get(lead.ref) ?? Promise.resolve()
  const atual = anterior.catch(() => undefined).then(() => processar(lead.ref, arquivos))
  emAndamento.set(lead.ref, atual)
  try {
    const { dados, status } = await atual
    return json(dados, status)
  } catch (err) {
    console.error('[atendai] documentos falharam:', err instanceof Error ? err.message : err)
    return json({ erro: 'Não foi possível receber os documentos agora. Tente de novo em instantes.' }, 502)
  } finally {
    if (emAndamento.get(lead.ref) === atual) emAndamento.delete(lead.ref)
  }
}

async function processar(ref: string, arquivos: File[]): Promise<{ dados: Record<string, unknown>; status: number }> {
  let lead = findLeadByRef(ref)
  if (!lead) return { dados: { erro: 'Cadastro não encontrado.' }, status: 404 }
  if (lead.vistoriaData?.enviadoEm) {
    return { dados: { completo: true, jaEnviado: true, recebidos: [], faltam: [], naoLidos: 0, avisos: [] }, status: 200 }
  }

  const avisos: string[] = []
  const recebidos = new Set<string>()
  let naoLidos = 0
  let ilegiveis = 0

  // O mesmo arquivo já gravado (o chat manda de novo os anexos da conversa) não é lido outra vez.
  const jaGravados = new Set(
    Object.values(lead.vistoriaArquivos || {})
      .map((a) => a.sha256)
      .filter(Boolean) as string[]
  )

  const lidos = await Promise.all(
    arquivos.map(async (arquivo) => {
      if (arquivo.size === 0 || arquivo.size > MAX_FILE_BYTES) return { arquivo, erro: 'grande' as const }
      const buf = Buffer.from(await arquivo.arrayBuffer())
      const tipo = sniffType(buf)
      if (!tipo) return { arquivo, erro: 'formato' as const }
      if (jaGravados.has(hashDoArquivo(buf))) return { arquivo, repetido: true as const }
      let leitura: DocumentAiResult | null = null
      try {
        leitura = await extractDocumentWithAi({ imageBase64: buf.toString('base64'), mimeType: tipo.mime })
      } catch (err) {
        console.warn('[atendai] leitura de documento falhou:', err instanceof Error ? err.message : err)
      }
      return { arquivo, buf, leitura }
    })
  )

  for (const r of lidos) {
    if ('repetido' in r) continue
    if ('erro' in r) {
      naoLidos++
      avisos.push(
        r.erro === 'grande'
          ? 'Um arquivo passou de 12 MB: mande uma foto menor.'
          : 'Um arquivo não é foto nem PDF: mande foto (JPG ou PNG) ou PDF.'
      )
      continue
    }
    const { leitura, buf, arquivo } = r
    const slot =
      leituraConfiavel(leitura) && leitura.documentType !== 'desconhecido'
        ? SLOT_DO_TIPO[leitura.documentType]
        : undefined
    if (!slot || !leitura) {
      naoLidos++
      ilegiveis++
      continue
    }
    if (slot === 'crlv' && leitura.vehicle?.placa && lead.placa && !mesmaPlaca(leitura.vehicle.placa, lead.placa)) {
      avisos.push(
        `O documento do veículo é de outra placa (final ${leitura.vehicle.placa.slice(-3)}), não do carro da cotação. Mande o documento do carro cotado.`
      )
      continue
    }
    const gravado = receberArquivo(lead, slot, buf, arquivo.name || `${slot}`)
    if (!gravado.ok) {
      avisos.push(gravado.erro)
      continue
    }
    aplicarLeitura(ref, leitura)
    // Lido aqui no servidor: vale para conferir o estado e o preço (regiao-comprovante.ts).
    if (slot === 'comprovanteResidencia') guardarComprovanteLido(ref, leitura, hashDoArquivo(buf))
    recebidos.add(NOME[slot])
    lead = findLeadByRef(ref) || lead
  }
  if (ilegiveis) {
    avisos.push(
      ilegiveis === 1
        ? 'Não consegui ler um dos arquivos. Mande de novo, de preferência o PDF do documento (CNH e documento do carro no app Carteira Digital de Trânsito, conta em PDF) ou uma foto do documento inteiro, nítida e sem reflexo.'
        : `Não consegui ler ${ilegiveis} arquivos. Mande de novo, de preferência o PDF de cada documento (CNH e documento do carro no app Carteira Digital de Trânsito, conta em PDF) ou uma foto do documento inteiro, nítida e sem reflexo.`
    )
  }

  lead = findLeadByRef(ref) || lead
  const arq = lead.vistoriaArquivos || {}
  const faltam = DOCUMENTOS_OBRIGATORIOS.filter((s) => !arq[s]).map((s) => NOME[s])

  if (faltam.length) {
    return {
      dados: {
        completo: false,
        recebidos: [...recebidos],
        faltam,
        naoLidos,
        avisos,
        proximoPasso: `Falta mandar: ${faltam.join(', ')}, ${DOCUMENTOS_EM_PDF}.`,
      },
      status: 200,
    }
  }

  const concluido = await concluirDocumentos(ref, { avisarWhatsApp: false, origem: 'chat' })
  if (!concluido.ok) return { dados: { erro: concluido.erro }, status: concluido.status }
  return {
    dados: {
      completo: true,
      recebidos: [...recebidos],
      faltam: [],
      naoLidos,
      avisos,
      proximoPasso:
        'Documentos completos. O link da vistoria (fotos do veículo pelo celular) chega aqui no WhatsApp em alguns minutos.',
    },
    status: 200,
  }
}
