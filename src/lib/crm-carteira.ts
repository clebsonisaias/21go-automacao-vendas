import fs from 'fs'
import path from 'path'
import { CRM_BASE_URL, CRM_PIPE_ID, getCrmToken } from './crm'
import { DATA_DIR, getStoredLeads } from './db'
import { sendCitchatMessage } from './citchat'
import { sendTelegramNotification } from './telegram'
import { absolute } from './links'
import {
  CardParado,
  DiaCarteira,
  EtapaFunil,
  KpisCarteira,
  MeuTrabalho,
  cardsParados,
  conferirTexto,
  finalDoTelefone,
  funilDosCards,
  lerCards,
  lerDias,
  lerFunilCrm,
  lerKpis,
  lerMeuTrabalho,
  lerPeriodo,
  linkDaProposta,
  resumoDasParadas,
} from './carteira'

/**
 * Painel da carteira (aba "Carteira" do /admin) e alerta de cotação parada (ver carteira.ts).
 *
 * Regras:
 * - Só leitura no CRM: nada aqui muda card, fase ou negociação.
 * - Os números ficam 5 minutos em memória (o painel não martela o CRM).
 * - Nada vai sozinho para o cliente. O WhatsApp de retomada só sai no clique de alguém da equipe,
 *   com o texto que a pessoa revisou, e no máximo uma vez a cada 24 h por card.
 * - O telefone do cliente não sai do servidor: o painel vê só o final ("•••• 1234").
 * - Nenhum nome, placa ou telefone vai para o log.
 * - Resumo das paradas no Telegram da equipe uma vez por dia, das 9h às 20h de Brasília
 *   (CARTEIRA_ALERTA=off desliga).
 */

export interface ParadaNoPainel extends CardParado {
  veiculo?: string
  propostaUrl?: string
  telefoneFinal?: string
  enviadoEm?: string
}

export interface DadosCarteira {
  geradoEm: string
  periodoDias: number
  kpis: KpisCarteira | null
  dias: DiaCarteira[]
  funilCrm: EtapaFunil[]
  funilSite: EtapaFunil[]
  totalCards: number
  meuTrabalho: MeuTrabalho | null
  paradas: ParadaNoPainel[]
  /** Partes do CRM que não responderam (o resto aparece normalmente). */
  faltou: string[]
}

const CACHE_MS = 5 * 60_000
const MAX_DETALHES = 20
const ENTRE_ENVIOS_MS = 24 * 60 * 60_000
const ARQUIVO = path.join(DATA_DIR, 'carteira.json')
const ID_CARD = /^[A-Za-z0-9-]{8,64}$/

let cache: { em: number; dados: DadosCarteira } | null = null
let buscando: Promise<DadosCarteira | null> | null = null

interface Estado {
  enviados: Record<string, string>
  alertaDia?: string
}

function lerEstado(): Estado {
  try {
    const e = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'))
    return { enviados: e && typeof e.enviados === 'object' && e.enviados ? e.enviados : {}, alertaDia: typeof e?.alertaDia === 'string' ? e.alertaDia : undefined }
  } catch {
    return { enviados: {} }
  }
}

function gravarEstado(e: Estado) {
  // Envios com mais de 60 dias saem do arquivo.
  const limite = Date.now() - 60 * 24 * 60 * 60_000
  const enviados = Object.fromEntries(Object.entries(e.enviados).filter(([, quando]) => Date.parse(quando) > limite))
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${ARQUIVO}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ ...e, enviados }, null, 2))
  fs.renameSync(tmp, ARQUIVO)
}

async function crmGet(token: string, caminho: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${CRM_BASE_URL}${caminho}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      console.warn(`[Carteira] CRM respondeu ${res.status} em ${caminho.split('/').slice(0, 3).join('/')}`)
      return null
    }
    return await res.json()
  } catch (e) {
    console.warn('[Carteira] CRM sem resposta:', e instanceof Error ? e.name : 'erro')
    return null
  }
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Telefone do card (o do WhatsApp primeiro). Só usado no servidor. */
function telefoneDoCard(detalhe: unknown): string {
  const d = obj(detalhe)
  const lead = obj(d.lead)
  const assoc = obj(d.associado)
  for (const v of [lead.whatsapp, assoc.whatsapp, lead.telefone, assoc.telefone]) {
    if (typeof v === 'string' && v.replace(/\D/g, '').length >= 10) return v
  }
  return ''
}

function codigoDaProposta(detalhe: unknown): unknown {
  const cot = obj(obj(detalhe).negociacao).cotacoes
  return Array.isArray(cot) ? obj(cot[0]).powerQuotationCode : undefined
}

/** Veículo pelo cadastro do site (o card do CRM não traz o modelo por extenso). */
function veiculoDoSite(cardId: string, placa: string): string {
  const lead = getStoredLeads().find((l) => l.id === cardId || (placa && (l.placa || l.vehicle?.placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() === placa))
  const v = lead?.vehicle
  if (!v || !v.modelo || v.modelo === 'Veículo') return ''
  return [v.marca, v.modelo, v.ano].filter(Boolean).join(' ').slice(0, 80)
}

async function montar(): Promise<DadosCarteira | null> {
  const token = await getCrmToken()
  if (!token) return null
  const [stats, meu, cards] = await Promise.all([
    crmGet(token, '/dashboard/stats'),
    crmGet(token, '/dashboard/meu-trabalho'),
    crmGet(token, `/pipes/${CRM_PIPE_ID}/cards?limit=100`),
  ])
  if (!stats && !meu && !cards) return null

  const listaCards = lerCards(cards)
  const estado = lerEstado()
  const paradas: ParadaNoPainel[] = cardsParados(listaCards, Date.now())
  await Promise.all(
    paradas.slice(0, MAX_DETALHES).map(async (p) => {
      const detalhe = await crmGet(token, `/pipes/cards/${p.id}`)
      if (detalhe) {
        p.propostaUrl = linkDaProposta(codigoDaProposta(detalhe)) || undefined
        p.telefoneFinal = finalDoTelefone(telefoneDoCard(detalhe)) || undefined
      }
      p.veiculo = veiculoDoSite(p.id, p.placa) || undefined
    })
  )
  for (const p of paradas) if (estado.enviados[p.id]) p.enviadoEm = estado.enviados[p.id]

  const faltou: string[] = []
  if (!stats) faltou.push('números do período')
  if (!cards) faltou.push('funil do site')
  return {
    geradoEm: new Date().toISOString(),
    periodoDias: lerPeriodo(stats),
    kpis: stats ? lerKpis(stats) : null,
    dias: lerDias(stats),
    funilCrm: lerFunilCrm(stats),
    funilSite: funilDosCards(listaCards),
    totalCards: listaCards.length,
    meuTrabalho: lerMeuTrabalho(meu),
    paradas,
    faltou,
  }
}

/** Dados do painel, do cache de 5 minutos ou do CRM. null = CRM fora do ar ou sem credenciais. */
export async function buscarCarteira(opcoes: { atualizar?: boolean } = {}): Promise<DadosCarteira | null> {
  if (!opcoes.atualizar && cache && Date.now() - cache.em < CACHE_MS) return cache.dados
  if (!buscando) {
    buscando = montar()
      .then((dados) => {
        if (dados) cache = { em: Date.now(), dados }
        return dados
      })
      .finally(() => {
        buscando = null
      })
  }
  return buscando
}

export type ResultadoEnvio = { ok: true; enviadoEm: string } | { ok: false; status: number; erro: string }

/** WhatsApp de retomada para o cliente de um card parado, com o texto revisado pela equipe. */
export async function enviarRetomada(cardId: unknown, textoBruto: unknown): Promise<ResultadoEnvio> {
  if (typeof cardId !== 'string' || !ID_CARD.test(cardId)) return { ok: false, status: 400, erro: 'Cotação não encontrada.' }
  const texto = conferirTexto(textoBruto)
  if (!texto) return { ok: false, status: 400, erro: 'Escreva a mensagem (de 10 a 1.000 caracteres).' }

  const anterior = lerEstado().enviados[cardId]
  if (anterior && Date.now() - Date.parse(anterior) < ENTRE_ENVIOS_MS) {
    return { ok: false, status: 409, erro: 'Já foi mandada uma mensagem para este cliente nas últimas 24 horas.' }
  }

  const token = await getCrmToken()
  if (!token) return { ok: false, status: 503, erro: 'O CRM não respondeu. Tente de novo em instantes.' }
  const detalhe = await crmGet(token, `/pipes/cards/${cardId}`)
  if (!detalhe) return { ok: false, status: 503, erro: 'O CRM não respondeu. Tente de novo em instantes.' }
  const pipe = obj(detalhe).pipeId
  if (typeof pipe === 'string' && pipe !== CRM_PIPE_ID) return { ok: false, status: 400, erro: 'Esta cotação não é do funil do site.' }
  const telefone = telefoneDoCard(detalhe)
  if (!telefone) return { ok: false, status: 400, erro: 'O card não tem WhatsApp. Confira o contato no CRM.' }

  // Marca antes de mandar (dois cliques não mandam duas vezes); se o envio falhar, desmarca.
  const agora = new Date().toISOString()
  const estado = lerEstado()
  if (estado.enviados[cardId] && Date.now() - Date.parse(estado.enviados[cardId]) < ENTRE_ENVIOS_MS) {
    return { ok: false, status: 409, erro: 'Já foi mandada uma mensagem para este cliente nas últimas 24 horas.' }
  }
  estado.enviados[cardId] = agora
  gravarEstado(estado)

  const r = await sendCitchatMessage(telefone, texto)
  if (!r.success) {
    const atual = lerEstado()
    if (atual.enviados[cardId] === agora) {
      delete atual.enviados[cardId]
      gravarEstado(atual)
    }
    return { ok: false, status: 502, erro: 'O WhatsApp não aceitou a mensagem. Tente de novo ou fale pelo CRM.' }
  }
  console.log('[Carteira] retomada enviada pelo painel')
  if (cache) {
    const p = cache.dados.paradas.find((x) => x.id === cardId)
    if (p) p.enviadoEm = agora
  }
  return { ok: true, enviadoEm: agora }
}

function hojeEHora(agora: Date): { dia: string; hora: number } {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora))
  return { dia, hora }
}

/** Uma rodada do alerta: no máximo um resumo por dia, das 9h às 20h de Brasília. */
export async function alertaParadasTick(agora = new Date()): Promise<boolean> {
  const { dia, hora } = hojeEHora(agora)
  if (hora < 9 || hora >= 20) return false
  if (lerEstado().alertaDia === dia) return false
  const dados = await buscarCarteira({ atualizar: true })
  if (!dados || dados.faltou.includes('funil do site')) return false // tenta na próxima rodada
  const estado = lerEstado()
  if (estado.alertaDia === dia) return false
  estado.alertaDia = dia
  gravarEstado(estado)
  if (!dados.paradas.length) return false
  const ok = await sendTelegramNotification(resumoDasParadas(dados.paradas, absolute('/admin#carteira')))
  console.log(`[Carteira] resumo das paradas ${ok ? 'enviado' : 'não enviado'} (${dados.paradas.length})`)
  return ok
}
