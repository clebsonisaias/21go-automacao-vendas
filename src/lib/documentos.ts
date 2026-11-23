import crypto from 'node:crypto'
import { StoredLead, findLeadByRef, updateLead, updateLeadVistoria } from '@/lib/db'
import { DocumentAiResult } from '@/lib/types'
import { MAX_FILE_BYTES, VISTORIA_SLOTS, VistoriaSlot, saveVistoriaFile, sniffType } from '@/lib/vistoria-files'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendWhatsAppVistoriaConfirmation } from '@/lib/citchat'
import { gerarLinkVistoria } from '@/lib/crm-vistoria'
import { conferirRegiao } from '@/lib/regiao-comprovante'

/**
 * Documentos do cadastro (CNH ou RG, CRLV e comprovante de residência), iguais para a
 * página /vistoria (rotas /api/vistoria/*) e para o chat de atendimento
 * (/api/atendai/v1/documentos): o mesmo arquivo gravado, a mesma leitura aplicada ao
 * cadastro e a mesma conclusão, que leva os documentos ao CRM e faz o card andar.
 */

export interface Falha {
  ok: false
  status: number
  erro: string
}

const falha = (status: number, erro: string): Falha => ({ ok: false, status, erro })

/** Os 3 documentos que o cadastro exige (as fotos do carro são feitas depois, no App Visto). */
export const DOCUMENTOS_OBRIGATORIOS = ['cnhOuRg', 'crlv', 'comprovanteResidencia'] as const

/** Impressão digital do arquivo: o mesmo arquivo mandado de novo não é lido outra vez. */
export const hashDoArquivo = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex')

/** Situação do cadastro que não aceita mais arquivo. */
export function bloqueioDoCadastro(lead: StoredLead): Falha | null {
  if (lead.status === 'cancelado') {
    return falha(410, 'Este cadastro foi encerrado. Faça uma nova cotação ou fale com a nossa equipe.')
  }
  if (lead.status === 'aprovado') {
    return falha(409, 'Esta vistoria já foi aprovada. Fale com a nossa equipe para alterar.')
  }
  return null
}

/** Grava um documento ou foto: tipo conferido pelo conteúdo, até 12 MB. */
export function receberArquivo(
  lead: StoredLead,
  slot: VistoriaSlot,
  buf: Buffer,
  nomeOriginal: string
): { ok: true } | Falha {
  const bloqueio = bloqueioDoCadastro(lead)
  if (bloqueio) return bloqueio
  if (buf.length === 0 || buf.length > MAX_FILE_BYTES) {
    return falha(413, 'Arquivo vazio ou acima de 12 MB. Envie uma foto menor.')
  }
  const type = sniffType(buf)
  if (!type || (type.ext === 'pdf' && !VISTORIA_SLOTS[slot].pdf)) {
    return falha(415, VISTORIA_SLOTS[slot].pdf ? 'Envie uma foto (JPG, PNG) ou PDF.' : 'Envie uma foto (JPG ou PNG).')
  }

  saveVistoriaFile(lead.id, slot, buf, type.ext)
  updateLead(lead.ref, (l) => {
    l.vistoriaArquivos = {
      ...(l.vistoriaArquivos || {}),
      [slot]: {
        ext: type.ext,
        mime: type.mime,
        size: buf.length,
        originalName: nomeOriginal.replace(/[^\w.\- ()]/g, '_').slice(0, 120),
        savedAt: new Date().toISOString(),
        sha256: hashDoArquivo(buf),
      },
    }
  })
  return { ok: true }
}

/** Leitura que pode ir para o cadastro: lida de verdade (a "simulation" traz dados de exemplo). */
export function leituraConfiavel(leitura: DocumentAiResult | undefined | null): leitura is DocumentAiResult {
  return Boolean(leitura?.success) && leitura?.model !== 'simulation'
}

/**
 * Completa o cadastro com a leitura de um documento: só preenche o que está vazio e só os
 * campos daquele documento (pessoa só da CNH, endereço só do comprovante, carro só do CRLV,
 * porque o carro pode ser de terceiro).
 */
export function aplicarLeitura(ref: string, leitura: DocumentAiResult): StoredLead | undefined {
  if (!leituraConfiavel(leitura)) return findLeadByRef(ref)
  const tipo = leitura.documentType
  return updateLead(ref, (l) => {
    if (tipo === 'cnh') {
      if (leitura.personal?.nome && !l.nome) l.nome = leitura.personal.nome
      if (leitura.personal?.cpf && !l.cpf) l.cpf = leitura.personal.cpf
    }
    if (tipo === 'comprovante_residencia') {
      if (leitura.address?.cidade && !l.cidade) l.cidade = leitura.address.cidade
      if (leitura.address?.uf && !l.uf) l.uf = leitura.address.uf
    }
    if (tipo !== 'crlv') return
    if (leitura.vehicle?.placa && !l.placa) l.placa = leitura.vehicle.placa
    if (leitura.vehicle?.chassi && !l.vehicle.chassi) l.vehicle.chassi = leitura.vehicle.chassi
    if (leitura.vehicle?.renavam && !l.vehicle.renavam) l.vehicle.renavam = leitura.vehicle.renavam
    if (leitura.vehicle?.marca && !l.vehicle.marca) l.vehicle.marca = leitura.vehicle.marca
    if (leitura.vehicle?.modelo && !l.vehicle.modelo) l.vehicle.modelo = leitura.vehicle.modelo
    if (leitura.vehicle?.anoModelo && !l.vehicle.ano) l.vehicle.ano = String(leitura.vehicle.anoModelo)
  })
}

/**
 * Conclui o envio dos documentos: confere os 3 arquivos gravados, marca o cadastro como
 * "vistoria_enviada", avisa a equipe e gera o link da vistoria no CRM em segundo plano.
 * `avisarWhatsApp`: o chat não manda o modelo "documentos recebidos", porque já responde na conversa.
 */
export async function concluirDocumentos(
  ref: string,
  opcoes: { avisarWhatsApp: boolean; origem: 'site' | 'chat' }
): Promise<{ ok: true } | Falha> {
  const lead = findLeadByRef(ref)
  if (!lead) return falha(404, 'Link de vistoria inválido ou expirado. Faça uma nova cotação.')
  if (lead.status === 'cancelado') {
    return falha(410, 'Este cadastro foi encerrado. Faça uma nova cotação ou fale com a nossa equipe.')
  }

  const arq = lead.vistoriaArquivos || {}
  if (!arq.cnhOuRg || !arq.crlv || !arq.comprovanteResidencia) {
    return falha(400, 'Faltam documentos: envie CNH ou RG, CRLV e comprovante de residência.')
  }
  const cnhOuRgNome = arq.cnhOuRg.originalName
  const crlvNome = arq.crlv.originalName
  const comprovanteResidenciaNome = arq.comprovanteResidencia.originalName
  const totalFotos = Object.keys(arq).filter((k) => k.startsWith('foto')).length

  updateLeadVistoria(lead.ref, { cnhOuRgNome, crlvNome, comprovanteResidenciaNome, totalFotos })

  const veiculo = `${lead.vehicle.marca} ${lead.vehicle.modelo}`
  const titulo = opcoes.origem === 'chat' ? '📄 <b>DOCUMENTOS RECEBIDOS PELO CHAT!</b> 📄' : '📄 <b>DOCUMENTOS RECEBIDOS!</b> 📄'
  const telegramMessage = `${titulo}

👤 <b>Cliente:</b> ${esc(lead.nome)}
🚗 <b>Veículo:</b> ${esc(veiculo)}
🔢 <b>Placa:</b> ${esc(lead.placa || 'Não informada')}
🔖 <b>Ref:</b> <code>${esc(lead.ref)}</code>

📁 <b>Documentos Enviados:</b>
- CNH ou RG: ${cnhOuRgNome ? `✅ ${esc(cnhOuRgNome)}` : 'Pendente'}
- Documento do Veículo (CRLV): ${crlvNome ? `✅ ${esc(crlvNome)}` : 'Pendente'}
- Comprovante de Residência: ${comprovanteResidenciaNome ? `✅ ${esc(comprovanteResidenciaNome)}` : 'Pendente'}

💡 <b>Próximo passo:</b> o site gera sozinho o link da vistoria no CRM 21Go e manda ao cliente (aviso aqui quando sair). Com a vistoria aprovada, clique no /admin em "Vistoria aprovada: enviar Pix" (a adesão é o último passo).`

  await sendTelegramNotification(telegramMessage)

  if (opcoes.avisarWhatsApp) {
    await sendWhatsAppVistoriaConfirmation({
      telefone: lead.whatsapp,
      nome: lead.nome,
      placa: lead.placa || 'Veículo',
    })
  }

  // Gera o link da vistoria no CRM 21Go em segundo plano; quem acompanha vê quando sair.
  void gerarLinkVistoria(lead.ref)
  // O comprovante confirma o estado e, com ele, o preço (Tabela Nordeste ou nacional).
  void conferirRegiao(lead.ref).catch((e: unknown) =>
    console.error('[regiao] conferência do comprovante falhou:', e instanceof Error ? e.message : e)
  )
  return { ok: true }
}
