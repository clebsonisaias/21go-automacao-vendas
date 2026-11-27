import { StoredLead, findLeadByRef, updateLead } from '@/lib/db'
import { extractDocumentWithAi } from '@/lib/document-ai'
import { readVistoriaFile } from '@/lib/vistoria-files'
import { calcularDesconto } from '@/lib/cupons'
import { calculateActivationFee, elegivelAoAdesivo } from '@/lib/pricing'
import { escolhaDeDesconto, mensalidadesComDescontos, percentualAdesivo, valorDaEscolha } from '@/lib/descontos'
import { autorizacaoNordeste } from '@/lib/powercrm-lead'
import { sendTelegramNotification, esc } from '@/lib/telegram'
import { sendCitchatMessage } from '@/lib/citchat'
import { utilitariosParaCotacao } from '@/lib/utilitarios'
import {
  ESTADOS_DA_TABELA,
  NOMES_CATEGORIA,
  UFS,
  precoNordeste,
  regiaoDoComprovante,
  type RegiaoDoComprovante,
} from '@/lib/tabela-nordeste'
import type { DocumentAiResult, VehicleInfo } from '@/lib/types'
import { PROMO_ADESAO, adesaoPromo } from '@/lib/promo-adesao'

/**
 * O comprovante de residência confirma onde o cliente mora, e com isso o preço:
 * - declarou RN, PB ou CE e o comprovante é de fora: volta ao preço nacional (do CRM);
 * - declarou fora e o comprovante é de RN, PB ou CE: passa para a Tabela Nordeste, se a FIPE tem
 *   faixa e o plano escolhido é o que a tabela substitui (o VIP); outro plano fica no preço do CRM;
 * - estado e CEP que não batem, ou que não deu para ler: o preço não muda e a equipe decide no /admin.
 *
 * Só vale leitura feita no servidor (a do navegador, na página /vistoria, pode ser editada).
 * Só muda o preço antes do Pix, e só de cadastros feitos com o preço por região. O Pix com o
 * preço da tabela só sai com o estado confirmado (`liberarPixDaRegiao`).
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

type Endereco = { uf?: string; cep?: string }

/**
 * Lê o comprovante gravado (se ainda não foi lido no servidor). `null` = falha técnica (IA fora do
 * ar, arquivo sumiu): a conferência tenta de novo antes do Pix.
 */
async function enderecoDoComprovante(lead: StoredLead): Promise<Endereco | null> {
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
    if (!leitura.success || leitura.model === 'simulation') return null
    // Lido, mas não é comprovante: não é falha técnica, a equipe confere.
    if (leitura.documentType !== 'comprovante_residencia') return {}
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
  if (l.cupom?.codigo === PROMO_ADESAO.codigo) {
    // Cadastro feito na promoção do dia: a adesão continua a da promoção, sobre a adesão nova.
    const final = adesaoPromo(ativacaoBase)
    const desconto = Math.round((ativacaoBase - final) * 100) / 100
    l.ativacaoOriginal = ativacaoBase
    l.ativacao = final
    l.cupom = { ...l.cupom, desconto, valorDesconto: desconto }
  } else if (l.cupom) {
    const { valorDesconto, ativacaoFinal } = calcularDesconto(ativacaoBase, l.cupom)
    l.ativacaoOriginal = ativacaoBase
    l.ativacao = ativacaoFinal
    l.cupom = { ...l.cupom, valorDesconto }
  } else {
    l.ativacao = ativacaoBase
  }
}

/**
 * As três mensalidades da tabela regional para este cadastro: o valor da tabela é o normal, e
 * pagamento em dia e adesivo entram por cima, como nos outros planos (src/lib/descontos.ts).
 */
function opcoesDaTabela(l: StoredLead, normal: number) {
  const v = l.vehicle as unknown as VehicleInfo
  const { pontualidade, adesivo } = mensalidadesComDescontos(
    normal,
    percentualAdesivo(l.planoEscolhidoId, v.fipeValue, elegivelAoAdesivo(v))
  )
  return { normal, pontualidade, adesivo }
}

function paraNacional(l: StoredLead): boolean {
  const nac = l.planoNacional
  if (!nac) return false
  // Mantém a escolha do cliente (normal, em dia ou com adesivo); sem reconhecer, vale a de pagamento em dia.
  const escolha =
    (l.tabelaNordeste && escolhaDeDesconto(l.mensalidadeFinal, opcoesDaTabela(l, l.tabelaNordeste.mensalidade))) ||
    'pontualidade'
  trocarValores(l, valorDaEscolha(escolha, { normal: nac.monthly, pontualidade: nac.pontualidade, adesivo: nac.adesivo }), nac.ativacao)
  l.comAdesivo = escolha === 'adesivo'
  l.precoRegiao = 'nacional'
  delete l.tabelaNordeste
  return true
}

/** Passa para a tabela; devolve o motivo quando não dá para trocar sozinho. */
function paraRegional(l: StoredLead): string | null {
  if (l.planoBaseId && l.planoEscolhidoId !== l.planoBaseId) {
    return `o plano escolhido (${l.planoEscolhidoNome}) não é o que a tabela substitui`
  }
  const v = l.vehicle
  const tabela = precoNordeste(
    { tipo: v.tipo === 'Moto' ? 'moto' : 'carro', modelo: v.modelo, fipe: v.fipeValue, marca: v.marca },
    utilitariosParaCotacao()
  )
  if (!tabela) return 'a FIPE do veículo passa da tabela'
  const veic = { marca: v.marca, modelo: v.modelo, ano: v.ano, fipeValue: v.fipeValue, fipeCode: v.fipeCode }
  const ativ = calculateActivationFee(veic, tabela.mensalidade, [{ id: l.planoEscolhidoId, monthly: tabela.mensalidade }])
  // Mantém a escolha do cliente (normal, em dia ou com adesivo); sem reconhecer, vale a de pagamento em dia.
  const nac = l.planoNacional
  const escolha =
    (nac && escolhaDeDesconto(l.mensalidadeFinal, { normal: nac.monthly, pontualidade: nac.pontualidade, adesivo: nac.adesivo })) ||
    'pontualidade'
  trocarValores(l, valorDaEscolha(escolha, opcoesDaTabela(l, tabela.mensalidade)), ativ)
  l.precoRegiao = 'regional'
  l.tabelaNordeste = tabela
  l.comAdesivo = escolha === 'adesivo'
  return null
}

type Mudanca = { antes: { m: number; a: number }; depois: { m: number; a: number } }
type Resultado =
  | { acao: 'conferir'; motivo: string }
  | { acao: 'confirmado' | 'sem_regiao' | 'velha' }
  | { acao: 'bloqueado'; uf: string; motivo: string }
  | ({ acao: 'voltou_nacional' | 'ganhou_tabela'; uf: string } & Mudanca)

/**
 * Aplica a região do comprovante ao cadastro (troca atômica). `sha256` = o arquivo lido: se o
 * cliente trocou o comprovante no meio da leitura, a leitura velha é descartada. Sem `sha256`
 * (falha técnica), nada fica marcado como conferido.
 */
export function aplicarRegiao(ref: string, regiao: RegiaoDoComprovante, sha256: string | null, agora = new Date()): Resultado | null {
  let r: Resultado | null = null
  updateLead(ref, (l) => {
    const atualSha = l.vistoriaArquivos?.comprovanteResidencia?.sha256
    if (sha256 && atualSha && atualSha !== sha256) return void (r = { acao: 'velha' })
    const em = agora.toISOString()
    const anterior = l.regiaoConfirmada
    const manter = {
      ...(sha256 ? { sha256 } : {}),
      ...(anterior?.releituraEm ? { releituraEm: anterior.releituraEm } : {}),
      ...(anterior?.pixSeguradoEm ? { pixSeguradoEm: anterior.pixSeguradoEm } : {}),
    }
    if (regiao.status === 'conferir') {
      l.regiaoConfirmada = { status: 'conferir', motivo: regiao.motivo, em, ...manter }
      return void (r = { acao: 'conferir', motivo: regiao.motivo })
    }
    l.regiaoConfirmada = { status: regiao.status, uf: regiao.uf, em, ...manter }
    if (!l.precoRegiao) return void (r = { acao: 'sem_regiao' })
    const regional = regiao.status === 'regional'
    if (regional === (l.precoRegiao === 'regional')) return void (r = { acao: 'confirmado' })
    if (!precoAindaMuda(l)) return void (r = { acao: 'bloqueado', uf: regiao.uf, motivo: 'o cadastro já passou do Pix' })

    const antes = { m: l.mensalidadeFinal, a: l.ativacao }
    if (!regional) {
      if (!paraNacional(l)) return void (r = { acao: 'bloqueado', uf: regiao.uf, motivo: 'faltam os valores do CRM no cadastro' })
    } else {
      // Mora na região, mas escolheu outro plano: fica no preço do CRM, como escolheu (sem alerta).
      if (l.planoBaseId && l.planoEscolhidoId !== l.planoBaseId) return void (r = { acao: 'confirmado' })
      const motivo = paraRegional(l)
      if (motivo) {
        // Comprovante da região, mas a troca não é automática: a equipe decide (o preço segue o nacional).
        const texto = `comprovante de ${regiao.uf}, mas ${motivo}`
        l.regiaoConfirmada = { status: 'conferir', uf: regiao.uf, motivo: texto, em, ...manter }
        return void (r = { acao: 'conferir', motivo: texto })
      }
    }
    l.regiaoConfirmada.mudouPreco = true
    r = { acao: regional ? 'ganhou_tabela' : 'voltou_nacional', uf: regiao.uf, antes, depois: { m: l.mensalidadeFinal, a: l.ativacao } }
  })
  return r
}

const cliente = (l: StoredLead) => `${esc(l.nome || 'Cliente')} (placa ${esc(l.placa || l.vehicle.placa || 'não informada')})`
const declarado = (l: StoredLead) =>
  l.ufDeclarada ? `estado informado na cotação: ${l.ufDeclarada}` : 'sem estado informado na cotação'
const precoAtual = (l: StoredLead) => (l.precoRegiao === 'regional' ? 'da tabela regional' : 'nacional')

/** Avisa o cliente; se o WhatsApp não sair, a equipe fica sabendo. */
async function avisarCliente(l: StoredLead, texto: string): Promise<void> {
  const r = await sendCitchatMessage(l.atendaiTelefone || l.whatsapp, texto).catch((e: unknown) => ({
    success: false,
    error: e instanceof Error ? e.message : String(e),
  }))
  if (!r.success) {
    console.warn('[regiao] aviso ao cliente não saiu:', r.error)
    await sendTelegramNotification(
      `⚠️ O cliente ${cliente(l)} <b>não recebeu</b> no WhatsApp o aviso do preço novo. Avise por outro meio: mensalidade ${brl(l.mensalidadeFinal)}, adesão ${brl(l.ativacao)}.`
    )
  }
}

async function avisarMudanca(l: StoredLead, r: { acao: 'voltou_nacional' | 'ganhou_tabela'; uf: string } & Mudanca): Promise<void> {
  const ganhou = r.acao === 'ganhou_tabela'
  const aut = autorizacaoNordeste(l)
  const crm =
    ganhou && aut
      ? `📝 Ponha no topo das observações do lead no CRM (sem isso o CRM não aplica o valor da tabela):\n<code>${esc(aut)}</code>`
      : '📝 Tire das observações do lead no CRM a autorização da Tabela Nordeste: vale o preço nacional.'
  await sendTelegramNotification(
    `📍 <b>Preço mudou pelo comprovante${r.uf ? ` (${esc(nomeUf(r.uf))})` : ''}</b>\n\n👤 ${cliente(l)}\n${esc(declarado(l))}; ${
      ganhou ? `vale a tabela regional (${esc(ESTADOS_DA_TABELA)})` : 'vale o preço nacional'
    }.\n💵 Mensalidade: ${brl(r.antes.m)} → <b>${brl(r.depois.m)}</b>\n⚡ Adesão: ${brl(r.antes.a)} → <b>${brl(r.depois.a)}</b>${
      l.cupom ? ` (com o cupom ${esc(l.cupom.codigo)})` : ''
    }\n\n${crm}`
  )
  const t = l.tabelaNordeste
  const nac = l.planoNacional?.monthly
  const onde = r.uf ? `o endereço é de ${nomeUf(r.uf)}` : 'conferimos o endereço'
  const texto = ganhou
    ? `Olá! Conferimos seu comprovante de residência: ${onde}. ${
        r.depois.m < r.antes.m ? 'Boa notícia: q' : 'Q'
      }uem mora no Rio Grande do Norte, na Paraíba ou no Ceará paga a mensalidade da tabela regional${
        t ? ` (${NOMES_CATEGORIA[t.categoria].toLowerCase()})` : ''
      }: ${nac && nac > r.depois.m ? `de ${brl(nac)} por ` : ''}${brl(r.depois.m)} por mês. A adesão fica ${brl(r.depois.a)}. O resto do cadastro segue igual.`
    : `Olá! Conferimos seu comprovante de residência: ${onde}. A tabela regional vale só para quem mora no Rio Grande do Norte, na Paraíba ou no Ceará, então a mensalidade fica no preço nacional: ${brl(r.depois.m)} por mês, e a adesão fica ${brl(r.depois.a)}. O resto do cadastro segue igual. Qualquer dúvida, é só responder aqui.`
  await avisarCliente(l, texto)
}

/**
 * Confere a região pelo comprovante e avisa equipe e cliente quando o preço muda.
 * Roda em segundo plano depois que os documentos chegam (concluirDocumentos) e, de novo, antes
 * de liberar o Pix quando a primeira conferência falhou (`forcar`).
 */
export async function conferirRegiao(ref: string, opcoes: { forcar?: boolean } = {}): Promise<void> {
  const lead = findLeadByRef(ref)
  const arq = lead?.vistoriaArquivos?.comprovanteResidencia
  // Cadastro de antes do preço por região: não gasta leitura nem gera aviso.
  if (!lead || !arq || !lead.precoRegiao) return
  // O mesmo comprovante já conferido não é conferido de novo (nem avisa de novo).
  if (!opcoes.forcar && arq.sha256 && lead.regiaoConfirmada?.sha256 === arq.sha256) return
  const endereco = await enderecoDoComprovante(lead)
  const r = endereco
    ? aplicarRegiao(ref, regiaoDoComprovante(endereco), arq.sha256 || '')
    : aplicarRegiao(ref, { status: 'conferir', motivo: 'não deu para ler o comprovante agora (falha técnica)' }, null)
  const atual = findLeadByRef(ref)
  if (!r || !atual) return

  switch (r.acao) {
    case 'conferir':
      await sendTelegramNotification(
        `⚠️ <b>Conferir o comprovante de residência</b>\n\n👤 ${cliente(atual)}\n📍 ${esc(r.motivo)} (${esc(declarado(atual))}).\n\nO preço não mudou: continua o ${precoAtual(atual)}.${
          atual.precoRegiao === 'regional' ? ' O Pix só é liberado depois que a equipe decidir.' : ''
        } Decida no /admin, no cadastro: "Confirmar a tabela regional" ou "Usar o preço nacional".`
      )
      return
    case 'bloqueado':
      await sendTelegramNotification(
        `⚠️ <b>Comprovante de ${esc(nomeUf(r.uf))}</b>, mas o preço não foi trocado sozinho (${esc(r.motivo)}).\n\n👤 ${cliente(atual)}\n📍 ${esc(declarado(atual))}. Confira o valor com o cliente.`
      )
      return
    case 'voltou_nacional':
    case 'ganhou_tabela':
      await avisarMudanca(atual, r)
      return
    default:
      return
  }
}

/**
 * Antes de liberar o Pix (aprovarVistoria): preço da tabela só com o estado confirmado. Se a
 * primeira conferência falhou por motivo técnico (ou nem rodou), lê de novo uma vez. Sem
 * confirmação, segura o Pix e avisa a equipe uma vez.
 */
export async function liberarPixDaRegiao(ref: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  let l = findLeadByRef(ref)
  if (!l || l.precoRegiao !== 'regional' || l.regiaoConfirmada?.status === 'regional') return { ok: true }
  const falhaTecnica = !l.regiaoConfirmada || (l.regiaoConfirmada.status === 'conferir' && !l.regiaoConfirmada.sha256)
  if (falhaTecnica && !l.regiaoConfirmada?.releituraEm) {
    const em = new Date().toISOString()
    updateLead(ref, (x) => {
      x.regiaoConfirmada = { ...(x.regiaoConfirmada ?? { status: 'conferir', em }), releituraEm: em }
    })
    await conferirRegiao(ref, { forcar: true })
    l = findLeadByRef(ref)
    if (!l || l.precoRegiao !== 'regional' || l.regiaoConfirmada?.status === 'regional') return { ok: true }
  }
  const motivo = 'o preço da tabela regional ainda não foi confirmado pelo comprovante'
  if (!l.regiaoConfirmada?.pixSeguradoEm) {
    const em = new Date().toISOString()
    updateLead(ref, (x) => {
      x.regiaoConfirmada = { ...(x.regiaoConfirmada ?? { status: 'conferir', em }), pixSeguradoEm: em }
    })
    await sendTelegramNotification(
      `⏸️ <b>Pix da adesão segurado</b>: vistoria aprovada, mas ${esc(motivo)}.\n\n👤 ${cliente(l)}\n📍 ${esc(declarado(l))}${
        l.regiaoConfirmada?.motivo ? `; ${esc(l.regiaoConfirmada.motivo)}` : ''
      }.\n\nNo /admin, no cadastro: "Confirmar a tabela regional" (comprovante confere) ou "Usar o preço nacional". O Pix sai depois disso.`
    )
  }
  return { ok: false, motivo }
}

/** Decisão da equipe no /admin quando o comprovante não confirmou sozinho. */
export async function decidirRegiao(
  ref: string,
  decisao: 'regional' | 'nacional'
): Promise<{ ok: true; lead: StoredLead } | { ok: false; erro: string }> {
  let erro = ''
  let mudou: Mudanca | null = null
  const atual = updateLead(ref, (l) => {
    if (!l.precoRegiao) return void (erro = 'Este cadastro é de antes do preço por região.')
    if (!precoAindaMuda(l)) return void (erro = 'O Pix deste cadastro já foi gerado: o preço não muda mais por aqui.')
    const em = new Date().toISOString()
    const antes = { m: l.mensalidadeFinal, a: l.ativacao }
    if (decisao === 'nacional') {
      if (l.precoRegiao === 'regional' && !paraNacional(l)) return void (erro = 'Faltam os valores do CRM neste cadastro.')
      l.regiaoConfirmada = { status: 'fora', em, porEquipe: true, motivo: 'a equipe decidiu pelo preço nacional' }
    } else {
      if (l.precoRegiao !== 'regional') {
        const motivo = paraRegional(l)
        if (motivo) return void (erro = `Não dá para usar a tabela: ${motivo}.`)
      }
      l.regiaoConfirmada = {
        status: 'regional',
        uf: l.regiaoConfirmada?.uf || l.ufDeclarada,
        em,
        porEquipe: true,
        motivo: 'a equipe confirmou o comprovante',
      }
    }
    if (antes.m !== l.mensalidadeFinal || antes.a !== l.ativacao) {
      l.regiaoConfirmada.mudouPreco = true
      mudou = { antes, depois: { m: l.mensalidadeFinal, a: l.ativacao } }
    }
  })
  if (!atual) return { ok: false, erro: 'Cadastro não encontrado.' }
  if (erro) return { ok: false, erro }
  const m = mudou as Mudanca | null
  if (m) await avisarMudanca(atual, { acao: decisao === 'regional' ? 'ganhou_tabela' : 'voltou_nacional', uf: atual.regiaoConfirmada?.uf || '', ...m })
  return { ok: true, lead: atual }
}
