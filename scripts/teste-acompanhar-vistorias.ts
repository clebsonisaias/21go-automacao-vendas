/**
 * Teste do acompanhamento das vistorias no CRM (acompanharVistorias, src/lib/crm-vistoria.ts).
 *
 * 25 cadastros em "vistoria_enviada" e um CRM falso local: em 3 rodadas (3 minutos do agendador),
 * cada cadastro tem de ser conferido pelo menos uma vez, sem passar de 10 consultas por rodada.
 * O último cadastro do arquivo tem a vistoria "aprovada" no CRM falso: o Pix da adesão tem de ser liberado.
 *
 * Nunca chama o CRM de verdade: DATA_DIR é uma pasta temporária, CRM_BASE_URL aponta para o servidor
 * local e qualquer fetch para outro endereço é recusado. WhatsApp, e-mail e Telegram ficam desligados.
 *
 *   npx --yes tsx scripts/teste-acompanhar-vistorias.ts               # 3 rodadas seguidas (rápido)
 *   npx --yes tsx scripts/teste-acompanhar-vistorias.ts --tempo-real  # agendador de verdade, ~3 min
 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import type { StoredLead } from '../src/lib/db'

const TOTAL = 25
const POR_RODADA = 10
const RODADAS = 3
const APROVADA = 'T25'
const tempoReal = process.argv.includes('--tempo-real')

const ref = (i: number) => `T${String(i).padStart(2, '0')}`
const negIdDe = (r: string) => `neg-${r}`

/** CRM falso: login e situação da vistoria. Guarda cada consulta, com a rodada em que veio. */
function iniciarCrmFalso(rodadaAtual: () => number) {
  const consultas: { negId: string; rodada: number }[] = []
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (req.method === 'POST' && url.pathname === '/auth/login') return json(200, { token: 'token-de-teste' })
    const m = url.pathname.match(/^\/vistoria-propria\/([^/]+)$/)
    if (req.method === 'GET' && m) {
      const negId = decodeURIComponent(m[1])
      consultas.push({ negId, rodada: rodadaAtual() })
      const status = negId === negIdDe(APROVADA) ? 'aprovada' : 'em_andamento'
      return json(200, { configurado: true, vistoria: { status, url: `https://vistoria.teste/${negId}` } })
    }
    json(404, { message: `rota não existe no CRM falso: ${req.method} ${url.pathname}` })
  })
  return { server, consultas }
}

function leadDeTeste(i: number): StoredLead {
  const r = ref(i)
  return {
    id: `lead_teste_${i}`,
    ref: r,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    nome: `Cliente Teste ${i}`,
    whatsapp: `1199999${String(i).padStart(4, '0')}`,
    placa: `TST${String(1000 + i)}`,
    planoEscolhidoId: 'plano-teste',
    planoEscolhidoNome: 'Plano Teste',
    mensalidadeFinal: 150,
    ativacao: 200,
    comAdesivo: false,
    vehicle: { marca: 'Teste', modelo: 'Modelo', ano: '2020', fipeValue: 50000, fipeCode: '000000-0' },
    appVistoUrl: `https://vistoria.teste/${negIdDe(r)}`,
    appVistoEnviadoEm: new Date().toISOString(),
    crmVistoria: { negId: negIdDe(r), cotacaoId: `cot-${r}`, tentativas: 0 },
    vistoriaData: { enviadoEm: new Date().toISOString() },
    status: 'vistoria_enviada',
  }
}

async function main() {
  let rodada = 0
  // Rodada da consulta: o contador do laço, ou (tempo real) o minuto do agendador em que ela chegou.
  let rodadaAgora = () => rodada
  const { server, consultas } = iniciarCrmFalso(() => rodadaAgora())
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
  const origem = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), '21go-teste-'))

  // Tudo antes de carregar o código do site: CRM e DATA_DIR são lidos quando o módulo carrega.
  process.env.DATA_DIR = dataDir
  process.env.CRM_BASE_URL = origem
  process.env.CRM_EMAIL = 'teste@teste.local'
  process.env.CRM_PASSWORD = 'senha-de-teste'
  process.env.MP_ACCESS_TOKEN = 'TEST-token-falso' // só liga o caminho "libera o Pix"; nada chama o Mercado Pago
  for (const k of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'BREVO_API_KEY', 'MAIL_FROM', 'CITCHAT_GATEWAY_TOKEN', 'ATENDEHUB_API_KEY', 'CRM_VISTORIA_AUTO']) {
    delete process.env[k]
  }
  const fetchOriginal = globalThis.fetch
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith(`${origem}/`)) throw new Error(`teste: chamada bloqueada para fora do CRM falso: ${url}`)
    return fetchOriginal(input, init)
  }) as typeof fetch

  const falhas: string[] = []
  try {
    const db = await import('../src/lib/db')
    if (db.DATA_DIR !== dataDir) throw new Error(`DATA_DIR não é a pasta de teste (${db.DATA_DIR})`)
    db.writeLeads(Array.from({ length: TOTAL }, (_, i) => leadDeTeste(i + 1)))
    const { acompanharVistorias } = await import('../src/lib/crm-vistoria')

    if (tempoReal) {
      const { startVistoriaLinkScheduler } = await import('../src/instrumentation-node')
      const inicio = Date.now()
      rodadaAgora = () => Math.round((Date.now() - inicio) / 60_000) // o agendador roda aos 60, 120 e 180 s
      startVistoriaLinkScheduler()
      console.log('Agendador real ligado; esperando 3 min 15 s...')
      await new Promise((ok) => setTimeout(ok, 3 * 60_000 + 15_000))
    } else {
      for (rodada = 1; rodada <= RODADAS; rodada++) await acompanharVistorias()
    }

    const porRodada = new Map<number, string[]>()
    for (const c of consultas) porRodada.set(c.rodada, [...(porRodada.get(c.rodada) || []), c.negId])
    for (const [n, negs] of [...porRodada].sort((a, b) => a[0] - b[0])) {
      console.log(`Rodada ${n}: ${negs.length} consulta(s) — ${negs.map((x) => x.replace('neg-', '')).join(' ')}`)
      if (negs.length > POR_RODADA) falhas.push(`rodada ${n} consultou ${negs.length} no CRM (máximo ${POR_RODADA})`)
    }
    if (porRodada.size > RODADAS) falhas.push(`houve ${porRodada.size} rodadas com consulta (esperado até ${RODADAS})`)

    const conferidos = new Set(consultas.map((c) => c.negId))
    const nunca = Array.from({ length: TOTAL }, (_, i) => ref(i + 1)).filter((r) => !conferidos.has(negIdDe(r)))
    if (nunca.length) falhas.push(`${nunca.length} cadastro(s) nunca conferido(s): ${nunca.join(' ')}`)

    for (const l of db.getStoredLeads()) {
      if (!l.crmVistoria?.conferidoEm) falhas.push(`${l.ref}: sem crmVistoria.conferidoEm`)
      if (l.ref === APROVADA) {
        if (l.status !== 'aguardando_pagamento') falhas.push(`${l.ref}: vistoria aprovada no CRM, mas o status ficou "${l.status}" (esperado aguardando_pagamento)`)
      } else if (l.crmVistoria?.vistoriaStatus !== 'em_andamento') {
        falhas.push(`${l.ref}: etapa "${l.crmVistoria?.vistoriaStatus ?? 'nenhuma'}" (esperado em_andamento)`)
      }
    }
    console.log(`Conferidos: ${conferidos.size}/${TOTAL} cadastros em ${consultas.length} consulta(s).`)
  } finally {
    globalThis.fetch = fetchOriginal
    server.close()
    fs.rmSync(dataDir, { recursive: true, force: true })
  }

  if (falhas.length) {
    console.error(`\nFALHOU (${falhas.length}):\n- ${falhas.join('\n- ')}`)
    process.exit(1)
  }
  console.log('\nOK: todos os cadastros conferidos, no máximo 10 por rodada, e a vistoria aprovada liberou o Pix.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
