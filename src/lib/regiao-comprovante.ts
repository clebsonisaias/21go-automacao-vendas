import { StoredLead, findLeadByRef, updateLead } from '@/lib/db'
import { extractDocumentWithAi } from '@/lib/document-ai'
import { readVistoriaFile } from '@/lib/vistoria-files'
import { calcularDesconto } from '@/lib/cupons'
import { calculateActivationFee } from '@/lib/pricing'
import { autorizacaoNordeste } from '@/lib/powercrm-lead'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendCitchatMessage } from '@/lib/citchat'
import { utilitariosParaCotacao } from '@/lib/utilitarios'
import { NOMES_CATEGORIA, UFS, precoNordeste, regiaoDoComprovante, type RegiaoDoComprovante } from '@/lib/tabela-nordeste'
import type { DocumentAiResult } from '@/lib/types'

/**
 * O comprovante de residência confirma onde o cliente mora, e com isso o preço:
 * - declarou Nordeste e o comprovante é de fora: volta ao preço nacional (do CRM);
 * - declarou fora e o comprovante é do Nordeste: passa para a Tabela Nordeste (se a FIPE tem faixa);
 * - estado e CEP que não batem, ou que não deu para ler: o preço não muda e a equipe confere.
 *
 * Só vale leitura feita no servidor (a do navegador, na página /vistoria, pode ser editada).
 * Só muda o preço antes do Pix, e só de cadastros feitos com o preço por região.
 */

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const nomeUf = (uf?: string) => (uf ? (UFS[uf] ?? uf) : '')

/** Endereço do comprovante lido no servidor (o chat lê ao receber o arquivo). */
export function guardarComprovanteLido(ref: string, leitura: DocumentAiResult, sha256: string): void {
  if (!leitura.success || leitura.model === 'simulation' || leitura.documentType !== 'comprovante_residencia') return
  updateLead(ref, (l) => {
    l.comprovanteLido = { sha256, uf: leitura.address?.uf, cep: leitura.address?.cep, em: new Date().toISOString() }
  })
}

/** Lê o comprovante gravado (se ainda não foi lido no servidor) e devolve o endereço. */
async function enderecoDoComprovante(lead: StoredLead): Promise<{ uf?: string; cep?: string } | null> {
  const arq = lead.vistoriaArquivos?.comprovanteResidencia
  if (!arq) return null
  if (lead.comprovanteLido && arq.sha256 && lead.comprovanteLido.sha256 === arq.sha256) return lead.comprovanteLido
  const buf = readVistoriaFile(lead.id, 'comprovanteResidencia', arq.ext)
  if (!buf) return null
  try {
    const leitura = await extractDocumentWithAi({
      imageBase64: buf.toString('base64'),
      mimeType: arq.mime,
      docTypeHint: 'comprovante_residencia',
    })
    if (!leitura.success || leitura.model === 'simulation' || leitura.documentType !== 'comprovante_residencia') return null
    guardarComprovanteLido(lead.ref, leitura, arq.sha256 || '')
    return { uf: leitura.address?.uf, cep: leitura.address?.cep }
  } catch (e) {
    console.warn('[regiao] leitura do comprovante falhou:', e instanceof Error ? e.message : e)
    return null
  }
}

/** Depois do Pix o preço não muda sozinho (a ordem do Mercado Pago é do valor antigo). */
const STATUS_SEM_MUDANCA = new Set(['aguardando_pagamento', 'adesao_paga', 'aprovado', 'cancelado', 'vendas_concretizadas'])
const precoAindaMuda = (l: StoredLead) => !l.pagamento && !STATUS_SEM_MUDANCA.has(l.status)

/** Troca mensalidade e adesão, reaplicando o cupom do cadastro sobre a adesão nova. */
function trocarValores(l: StoredLead, mensalidade: number, ativacaoBase: number): void {
  l.mensalidadeFinal = mensalidade
  if (l.cupom) {
    const { valorDesconto, ativacaoFinal } = calcularDesconto(ativacaoBase, l.cupom)
    l.ativacaoOriginal = ativacaoBase
    l.ativacao = ativacaoFinal
    l.cupom = { ...l.cupom, valorDesconto }
  } else {
    l.ativacao = ativacaoBase
  }
}

type Resultado =
  | { acao: 'conferir'; motivo: string }
  | { acao: 'confirmado' | 'sem_regiao' | 'sem_faixa' }
  | { acao: 'bloqueado'; uf: string }
  | { acao: 'voltou_nacional' | 'ganhou_nordeste'; uf: string; antes: { m: number; a: number }; depois: { m: number; a: number } }

/** Aplica a região do comprovante ao cadastro (troca atômica). */
export function aplicarRegiao(ref: string, regiao: RegiaoDoComprovante, sha256?: string, agora = new Date()): Resultado | null {
  let r: Resultado | null = null
  updateLead(ref, (l) => {
    const em = agora.toISOString()
    if (regiao.status === 'conferir') {
      l.regiaoConfirmada = { status: 'conferir', motivo: regiao.motivo, em, ...(sha256 ? { sha256 } : {}) }
      r = { acao: 'conferir', motivo: regiao.motivo }
      return
    }
    l.regiaoConfirmada = { status: regiao.status, uf: regiao.uf, em, ...(sha256 ? { sha256 } : {}) }
    // Cadastro de antes do preço por região: só registra.
    if (!l.precoRegiao) return void (r = { acao: 'sem_regiao' })
    const nordeste = regiao.status === 'nordeste'
    if (nordeste === (l.precoRegiao === 'nordeste')) return void (r = { acao: 'confirmado' })
    if (!precoAindaMuda(l)) return void (r = { acao: 'bloqueado', uf: regiao.uf })

    const antes = { m: l.mensalidadeFinal, a: l.ativacao }
    if (!nordeste) {
      const nac = l.planoNacional
      if (!nac) return void (r = { acao: 'bloqueado', uf: regiao.uf })
      trocarValores(l, nac.pontualidade, nac.ativacao)
      l.precoRegiao = 'nacional'
      delete l.tabelaNordeste
    } else {
      const v = l.vehicle
      const tabela = precoNordeste(
        { tipo: v.tipo === 'Moto' ? 'moto' : 'carro', modelo: v.modelo, fipe: v.fipeValue },
        utilitariosParaCotacao()
      )
      if (!tabela) return void (r = { acao: 'sem_faixa' })
      const veic = { marca: v.marca, modelo: v.modelo, ano: v.ano, fipeValue: v.fipeValue, fipeCode: v.fipeCode }
      const ativ = calculateActivationFee(veic, tabela.mensalidade, [{ id: l.planoEscolhidoId, monthly: tabela.mensalidade }])
      trocarValores(l, tabela.mensalidade, ativ)
      l.precoRegiao = 'nordeste'
      l.tabelaNordeste = tabela
      l.comAdesivo = false
    }
    l.regiaoConfirmada.mudouPreco = true
    r = {
      acao: nordeste ? 'ganhou_nordeste' : 'voltou_nacional',
      uf: regiao.uf,
      antes,
      depois: { m: l.mensalidadeFinal, a: l.ativacao },
    }
  })
  return r
}

/**
 * Confere a região pelo comprovante e avisa equipe e cliente quando o preço muda.
 * Roda em segundo plano depois que os documentos chegam (concluirDocumentos).
 */
export async function conferirRegiao(ref: string): Promise<void> {
  const lead = findLeadByRef(ref)
  const arq = lead?.vistoriaArquivos?.comprovanteResidencia
  if (!lead || !arq) return
  // O mesmo comprovante já conferido não é conferido de novo (nem avisa de novo).
  if (arq.sha256 && lead.regiaoConfirmada?.sha256 === arq.sha256) return
  const endereco = await enderecoDoComprovante(lead)
  const r = aplicarRegiao(ref, regiaoDoComprovante(endereco), arq.sha256)
  const atual = findLeadByRef(ref)
  if (!r || !atual) return

  const cliente = `${esc(atual.nome || 'Cliente')} (placa ${esc(atual.placa || atual.vehicle.placa || 'não informada')})`
  const declarado = atual.ufDeclarada ? `estado informado na cotação: ${atual.ufDeclarada}` : 'sem estado informado na cotação'

  switch (r.acao) {
    case 'conferir':
      await sendTelegramNotification(
        `⚠️ <b>Conferir o comprovante de residência</b>\n\n👤 ${cliente}\n📍 ${esc(r.motivo)} (${esc(declarado)}).\n\nO preço não mudou: continua o ${atual.precoRegiao === 'nordeste' ? 'da Tabela Nordeste' : 'nacional'}. Confira o comprovante no /admin.`
      )
      return
    case 'bloqueado':
      await sendTelegramNotification(
        `⚠️ <b>Comprovante de ${esc(nomeUf(r.uf))}</b>, mas o preço não foi trocado sozinho (o cadastro já passou do Pix ou não tem os valores do CRM).\n\n👤 ${cliente}\n📍 ${esc(declarado)}. Confira o preço à mão no /admin.`
      )
      return
    case 'voltou_nacional':
    case 'ganhou_nordeste': {
      const ganhou = r.acao === 'ganhou_nordeste'
      const aut = autorizacaoNordeste(atual)
      const crm = ganhou && aut
        ? `📝 Ponha no topo das observações do lead no CRM (sem isso o CRM não aplica o valor da tabela):\n<code>${esc(aut)}</code>`
        : '📝 Tire das observações do lead no CRM a autorização da Tabela Nordeste: vale o preço nacional.'
      await sendTelegramNotification(
        `📍 <b>Preço mudou pelo comprovante (${esc(nomeUf(r.uf))})</b>\n\n👤 ${cliente}\n${esc(declarado)}; o comprovante é ${ganhou ? 'do Nordeste' : 'de fora do Nordeste'}.\n💵 Mensalidade: ${brl(r.antes.m)} → <b>${brl(r.depois.m)}</b>\n⚡ Adesão: ${brl(r.antes.a)} → <b>${brl(r.depois.a)}</b>${atual.cupom ? ` (com o cupom ${esc(atual.cupom.codigo)})` : ''}\n\n${crm}`
      )
      const t = atual.tabelaNordeste
      const nac = atual.planoNacional?.monthly
      const texto = ganhou
        ? `Olá! Conferimos seu comprovante de residência: o endereço é de ${nomeUf(r.uf)}. Boa notícia: no Nordeste a mensalidade é a da Tabela Nordeste${t ? ` (${NOMES_CATEGORIA[t.categoria].toLowerCase()})` : ''}, ${nac && nac > r.depois.m ? `de ${brl(nac)} por ` : ''}${brl(r.depois.m)} por mês. A adesão fica ${brl(r.depois.a)}. O resto do cadastro segue igual.`
        : `Olá! Conferimos seu comprovante de residência: o endereço é de ${nomeUf(r.uf)}, fora do Nordeste. Por isso a mensalidade fica no preço nacional, ${brl(r.depois.m)} por mês, e a adesão fica ${brl(r.depois.a)}. O resto do cadastro segue igual. Qualquer dúvida, é só responder aqui.`
      await sendCitchatMessage(atual.atendaiTelefone || atual.whatsapp, texto).catch((e: unknown) =>
        console.warn('[regiao] aviso ao cliente não saiu:', e instanceof Error ? e.message : e)
      )
      return
    }
    default:
      return
  }
}
