import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR, getStoredLeads } from './db'
import { chaveTelefone } from './atendai'
import { sendCitchatMessage, sendWhatsAppCotacao } from './citchat'
import { APP_BASE_URL } from './links'
import {
  casaComLead,
  dentroDoHorario,
  ENTRE_MENSAGENS_EQUIPE,
  lembreteDevido,
  linkDeRetomada,
  paramsDoTemplate,
  semAsAntigas,
  textoDaMensagem,
  VALIDADE_LINK,
  VERSAO_CONSENTIMENTO,
  type CotacaoWhatsApp,
  type EnvioCotacao,
  type EtapaMensagem,
  type PedidoCotacao,
} from './cotacao-whatsapp'
import type { OrigemLead } from './origem'

/**
 * Guarda e envia as cotações pedidas pelo WhatsApp (regras em cotacao-whatsapp.ts).
 * Arquivo próprio, gravado de uma vez (tmp + rename); leitura e gravação sem `await` no meio,
 * então duas requisições não se atropelam.
 */

const ARQUIVO = path.join(DATA_DIR, 'cotacoes-whatsapp.json')
const POR_RODADA = 10

export function lerCotacoesWhatsApp(): CotacaoWhatsApp[] {
  let bruto: string
  try {
    bruto = fs.readFileSync(ARQUIVO, 'utf-8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return []
    throw e
  }
  const d = JSON.parse(bruto)
  if (!Array.isArray(d)) throw new Error('cotacoes-whatsapp.json não é uma lista')
  return d as CotacaoWhatsApp[]
}

function gravar(lista: CotacaoWhatsApp[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${ARQUIVO}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(semAsAntigas(lista, Date.now()), null, 2), 'utf-8')
  fs.renameSync(tmp, ARQUIVO)
}

/** Muda uma cotação (lê, aplica e grava de uma vez). Devolve a cotação depois da mudança. */
function mudar(id: string, fn: (c: CotacaoWhatsApp) => void): CotacaoWhatsApp | null {
  const lista = lerCotacoesWhatsApp()
  const c = lista.find((x) => x.id === id)
  if (!c) return null
  fn(c)
  gravar(lista)
  return c
}

export function linkDaCotacao(c: Pick<CotacaoWhatsApp, 'token'>): string {
  return linkDeRetomada(APP_BASE_URL, c.token)
}

export function criarCotacaoWhatsApp(dados: {
  whatsapp: string
  placa?: string
  uf?: string
  pedido: PedidoCotacao
  veiculo: CotacaoWhatsApp['veiculo']
  plano: CotacaoWhatsApp['plano']
  cupom?: string
  origem?: OrigemLead
}): CotacaoWhatsApp {
  const agora = new Date()
  const c: CotacaoWhatsApp = {
    id: `cw_${crypto.randomBytes(6).toString('hex')}`,
    token: crypto.randomBytes(24).toString('base64url'),
    criadaEm: agora.toISOString(),
    expiraEm: new Date(agora.getTime() + VALIDADE_LINK).toISOString(),
    whatsapp: dados.whatsapp,
    ...(dados.placa ? { placa: dados.placa } : {}),
    ...(dados.uf ? { uf: dados.uf } : {}),
    pedido: dados.pedido,
    veiculo: dados.veiculo,
    plano: dados.plano,
    ...(dados.cupom ? { cupom: dados.cupom } : {}),
    ...(dados.origem ? { origem: dados.origem } : {}),
    consentimento: { versao: VERSAO_CONSENTIMENTO, em: agora.toISOString() },
    envios: [],
    lembretes: [],
  }
  const lista = lerCotacoesWhatsApp()
  lista.push(c)
  gravar(lista)
  return c
}

async function enviar(c: CotacaoWhatsApp, etapa: EtapaMensagem): Promise<Omit<EnvioCotacao, 'em' | 'tipo'>> {
  const url = linkDaCotacao(c)
  const r = await sendWhatsAppCotacao({
    telefone: c.whatsapp,
    texto: textoDaMensagem(c, url, etapa),
    templateParams: paramsDoTemplate(c, url),
  })
  return { ok: r.success, ...(r.viaReserva ? { viaReserva: true } : {}), ...(typeof r.janela === 'boolean' ? { janela: r.janela } : {}) }
}

/** Manda a cotação pedida agora e anota o resultado (falha fica como "não recebeu" para a equipe). */
export async function enviarCotacaoPedida(c: CotacaoWhatsApp): Promise<boolean> {
  const r = await enviar(c, 'cotacao')
  mudar(c.id, (x) => x.envios.push({ em: new Date().toISOString(), tipo: 'cotacao', ...r }))
  return r.ok
}

/** Pedido repetido de uma cotação que não chegou: tenta de novo no mesmo registro. */
export function cotacaoEntregue(c: Pick<CotacaoWhatsApp, 'envios'>): boolean {
  return c.envios.some((e) => e.tipo === 'cotacao' && e.ok)
}

export function acharPorToken(token: string): CotacaoWhatsApp | null {
  const c = lerCotacoesWhatsApp().find((x) => x.token === token)
  if (!c || Date.parse(c.expiraEm) < Date.now()) return null
  return c
}

/** O link foi aberto: anota a primeira vez. */
export function marcarAberta(id: string): void {
  mudar(id, (c) => {
    if (!c.abertaEm) c.abertaEm = new Date().toISOString()
  })
}

/** Cadastro feito (site ou chat): fecha as cotações abertas da mesma placa ou do mesmo WhatsApp. */
export function marcarCotacaoFechada(lead: Parameters<typeof casaComLead>[1] & { ref: string }): void {
  const lista = lerCotacoesWhatsApp()
  let mudou = false
  for (const c of lista) {
    if (c.fechadaEm || !casaComLead(c, lead, chaveTelefone)) continue
    c.fechadaEm = new Date().toISOString()
    c.leadRef = lead.ref
    mudou = true
  }
  if (mudou) gravar(lista)
}

/** A pessoa falou com o chat do WhatsApp: os lembretes automáticos param (a conversa segue lá). */
export function marcarRespostaPorTelefone(telefone: string): void {
  const k = chaveTelefone(telefone)
  if (!k) return
  const lista = lerCotacoesWhatsApp()
  let mudou = false
  for (const c of lista) {
    if (c.fechadaEm || c.respondeuEm || c.paradaEm || chaveTelefone(c.whatsapp) !== k) continue
    c.respondeuEm = new Date().toISOString()
    mudou = true
  }
  if (mudou) gravar(lista)
}

/** Opt-out (o chat avisa que a pessoa pediu para parar) ou o botão da equipe. */
export function pararLembretes(filtro: { id?: string; telefone?: string }, por: 'equipe' | 'cliente'): number {
  const k = filtro.telefone ? chaveTelefone(filtro.telefone) : null
  if (!filtro.id && !k) return 0
  const lista = lerCotacoesWhatsApp()
  let n = 0
  for (const c of lista) {
    if (c.paradaEm || c.fechadaEm) continue
    if (filtro.id ? c.id !== filtro.id : chaveTelefone(c.whatsapp) !== k) continue
    c.paradaEm = new Date().toISOString()
    c.paradaPor = por
    n++
  }
  if (n) gravar(lista)
  return n
}

/**
 * Mensagem da equipe (botão "Preparar WhatsApp" do quadro "Cotou e não fechou"): o texto livre vai
 * pela reserva fora da janela; `[link da cotação]` vira o link de verdade. Uma a cada 24 h, e os
 * lembretes automáticos param (a conversa passa a ser da equipe).
 */
const mandandoAgora = new Set<string>()

export async function mensagemDaEquipe(id: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  // Dois cliques seguidos não mandam duas mensagens.
  if (mandandoAgora.has(id)) return { ok: false, erro: 'A mensagem já está sendo mandada.' }
  mandandoAgora.add(id)
  try {
    return await mandarMensagemDaEquipe(id, texto)
  } finally {
    mandandoAgora.delete(id)
  }
}

async function mandarMensagemDaEquipe(id: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  const c = lerCotacoesWhatsApp().find((x) => x.id === id)
  if (!c) return { ok: false, erro: 'Cotação não encontrada.' }
  const ultima = c.envios.filter((e) => e.tipo === 'equipe' && e.ok).map((e) => Date.parse(e.em)).sort((a, b) => b - a)[0]
  if (ultima && Date.now() - ultima < ENTRE_MENSAGENS_EQUIPE) return { ok: false, erro: 'Já foi uma mensagem nas últimas 24 horas.' }
  const corpo = texto.replace(/\[link da cota[cç][aã]o\]/gi, linkDaCotacao(c)).trim().slice(0, 1500)
  if (!corpo) return { ok: false, erro: 'Escreva a mensagem.' }
  const r = await sendCitchatMessage(c.whatsapp, corpo)
  mudar(id, (x) => {
    x.envios.push({ em: new Date().toISOString(), tipo: 'equipe', ok: r.success })
    if (r.success && !x.paradaEm) {
      x.paradaEm = new Date().toISOString()
      x.paradaPor = 'equipe'
    }
  })
  return r.success ? { ok: true } : { ok: false, erro: 'O WhatsApp não aceitou a mensagem. Tente de novo mais tarde.' }
}

/** Uma rodada dos lembretes automáticos (24 h e 72 h). */
export async function cotacoesTick(agora = new Date()): Promise<number> {
  // Fechar as que viraram cadastro vale a qualquer hora; mandar lembrete, só das 9h às 20h.
  const podeMandar = dentroDoHorario(agora)
  const agoraMs = agora.getTime()
  const leads = getStoredLeads()
  let enviados = 0
  for (const c of lerCotacoesWhatsApp()) {
    if (enviados >= POR_RODADA) break
    if (c.fechadaEm) continue
    const lead = leads.find((l) => casaComLead(c, l, chaveTelefone))
    if (lead) {
      // Cadastro pelo chat (que não passa pelo cadastro.ts do site): fecha aqui, mesmo com os
      // lembretes já parados, para a cotação sair do quadro "Cotou e não fechou".
      mudar(c.id, (x) => {
        x.fechadaEm = new Date().toISOString()
        x.leadRef = lead.ref
      })
      continue
    }
    if (c.paradaEm || c.respondeuEm || !podeMandar) continue
    const qual = lembreteDevido(c, agoraMs, { jaCadastrou: false })
    if (!qual) continue
    // Marcado antes de sair: falha do WhatsApp não vira repetição.
    // Confere de novo no arquivo (a rodada usa uma leitura do começo; alguém pode ter parado,
    // respondido ou se cadastrado durante os envios anteriores).
    const marcada = mudar(c.id, (x) => {
      if (x.fechadaEm || x.paradaEm || x.respondeuEm) return
      if (x.lembretes.length === qual - 1) x.lembretes.push(agora.toISOString())
    })
    if (!marcada || marcada.lembretes.length !== qual) continue
    const r = await enviar(marcada, qual === 1 ? 'lembrete1' : 'lembrete2')
    mudar(c.id, (x) => x.envios.push({ em: new Date().toISOString(), tipo: 'lembrete', ...r }))
    enviados++
    console.log(`[Cotação WhatsApp] lembrete ${qual} ${r.ok ? 'enviado' : 'falhou'}${r.viaReserva ? ' (reserva)' : ''}`)
  }
  return enviados
}

/** Para as rotas do chat: a pessoa está conversando (nunca derruba a rota por causa disto). */
export function conversaNoChat(telefone: unknown): void {
  try {
    if (typeof telefone === 'string' && telefone) marcarRespostaPorTelefone(telefone)
  } catch (e) {
    console.warn('[Cotação WhatsApp] não marcou a resposta:', e instanceof Error ? e.message : 'erro')
  }
}
