// Painel da carteira: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cardsParados,
  conferirTexto,
  faseDeProposta,
  finalDoTelefone,
  funilDosCards,
  lerCards,
  lerDias,
  lerFunilCrm,
  lerKpis,
  lerMeuTrabalho,
  lerPeriodo,
  linkDaProposta,
  mensagemDeRetomada,
  numero,
  primeiroNome,
  resumoDasParadas,
  temMovimento,
  tituloDoCard,
} from '../src/lib/carteira.ts'

// Formato da resposta do CRM (estrutura conferida em 25/11/2026; valores inventados).
const STATS = {
  periodDays: 7,
  generatedAt: '2026-11-25T06:00:00.000Z',
  kpis: { entradasPeriodo: 15, entradasDelta: 100, fechadosPeriodo: 0, taxaConversao: 0, emVistoria: 2, emNegociacao: '2', associadosTotal: 4 },
  funil: [
    { name: 'Entradas', count: 3, isWon: false, isLost: false },
    { name: 'Aprovado', count: 1, isWon: true, isLost: false },
    { name: 'Reprovado', count: 0, isWon: false, isLost: true },
    { name: '', count: 9 },
  ],
  timeline: [
    { date: '2026-11-21', entradas: 11, fechados: 0, receita: 0 },
    { date: '2026-11-20', entradas: 1, fechados: 0, receita: 0 },
    { date: 'ontem', entradas: 5 },
  ],
}

test('KPIs: número que não veio fica null, nunca zero', () => {
  const k = lerKpis(STATS)
  assert.equal(k.entradas, 15)
  assert.equal(k.entradasDelta, 100)
  assert.equal(k.emNegociacao, 2)
  assert.equal(k.receita, null)
  assert.equal(k.veiculosProtegidos, null)
  assert.equal(lerKpis(null).entradas, null)
  assert.equal(numero('abc'), null)
  assert.equal(numero(Infinity), null)
  assert.equal(lerPeriodo(STATS), 7)
  assert.equal(lerPeriodo({ periodDays: -3 }), 7)
})

test('funil e dias do CRM', () => {
  const f = lerFunilCrm(STATS)
  assert.deepEqual(f.map((e) => e.nome), ['Entradas', 'Aprovado', 'Reprovado'])
  assert.equal(f[1].ganho, true)
  assert.equal(f[2].perdido, true)
  const d = lerDias(STATS)
  assert.deepEqual(d.map((x) => x.data), ['2026-11-20', '2026-11-21'])
  assert.equal(d[1].entradas, 11)
})

test('meu trabalho: lê, ordena as colunas e sabe quando está zerado', () => {
  const m = lerMeuTrabalho({
    simulacoes: 0,
    placas: 0,
    fechadas: 0,
    boletos: { aVencer: 0, vencidos: 0, pagos: 0 },
    funil: [
      { coluna: 2, nome: 'Em negociação', total: 0 },
      { coluna: 1, nome: 'Cotações recebidas', total: 0 },
    ],
  })
  assert.ok(m)
  assert.deepEqual(m.colunas.map((c) => c.nome), ['Cotações recebidas', 'Em negociação'])
  assert.equal(temMovimento(m), false)
  m.boletos.vencidos = 1
  assert.equal(temMovimento(m), true)
  assert.equal(lerMeuTrabalho(null), null)
})

const agora = Date.parse('2026-11-25T12:00:00.000Z')
const horasAtras = (h: number) => new Date(agora - h * 3600_000).toISOString()
const CARDS = {
  data: [
    { id: 'aaaaaaaa-1', title: 'ABC1D23 · MARIA SOUZA', currentPhase: { name: 'Cotações recebidas', position: 1 }, createdAt: horasAtras(100), updatedAt: horasAtras(72) },
    { id: 'bbbbbbbb-2', title: 'QWE9876 · João', currentPhase: { name: 'Em negociação', position: 2 }, createdAt: horasAtras(200), updatedAt: horasAtras(120) },
    { id: 'cccccccc-3', title: 'Cliente sem placa', currentPhase: { name: 'Cotações recebidas', position: 1 }, createdAt: horasAtras(10), updatedAt: horasAtras(10) },
    { id: 'dddddddd-4', title: 'ZZZ1A11 · Ana', currentPhase: { name: 'Vistorias', position: 3 }, createdAt: horasAtras(300), updatedAt: horasAtras(300) },
    { id: 'x', title: 'id inválido' },
  ],
}

test('cards: funil do site por fase, na ordem das fases', () => {
  const cards = lerCards(CARDS)
  assert.equal(cards.length, 4)
  assert.deepEqual(funilDosCards(cards), [
    { nome: 'Cotações recebidas', total: 2 },
    { nome: 'Em negociação', total: 1 },
    { nome: 'Vistorias', total: 1 },
  ])
})

test('paradas: só no começo do funil, sem mudança há mais de 48 h, as mais antigas primeiro', () => {
  const p = cardsParados(lerCards(CARDS), agora)
  assert.deepEqual(p.map((c) => c.id), ['bbbbbbbb-2', 'aaaaaaaa-1'])
  assert.equal(p[0].dias, 5)
  assert.equal(p[1].placa, 'ABC1D23')
  assert.equal(p[1].nome, 'MARIA SOUZA')
  assert.equal(cardsParados(lerCards(CARDS), agora, 100).length, 1)
  assert.equal(faseDeProposta('Vistorias'), false)
  assert.equal(faseDeProposta('Cotações Recebidas'), true)
  assert.equal(faseDeProposta('EM NEGOCIAÇÃO'), true)
})

test('título do card e primeiro nome', () => {
  assert.deepEqual(tituloDoCard('abc-1d23 · Maria'), { placa: 'ABC1D23', nome: 'Maria' })
  assert.deepEqual(tituloDoCard('Sem placa · Maria'), { placa: '', nome: 'Sem placa · Maria' })
  assert.equal(primeiroNome('MARIA SOUZA'), 'Maria')
  assert.equal(primeiroNome('  '), '')
  assert.equal(primeiroNome('123'), '')
})

test('mensagem de retomada: com e sem link e veículo', () => {
  const m = mensagemDeRetomada({ nome: 'JOÃO SILVA', veiculo: 'Fiat Argo 2020', propostaUrl: 'https://checkout.cotacao.me/myplanquot?h=abc123' })
  assert.match(m, /^Olá, João!/)
  assert.match(m, /para o Fiat Argo 2020/)
  assert.match(m, /myplanquot\?h=abc123/)
  const s = mensagemDeRetomada({ nome: '', placa: 'ABC1D23' })
  assert.match(s, /^Olá!/)
  assert.match(s, /placa ABC1D23/)
  assert.doesNotMatch(s, /proposta e contratar/)
})

test('link da proposta, texto e final do telefone', () => {
  assert.equal(linkDaProposta('abc123'), 'https://checkout.cotacao.me/myplanquot?h=abc123')
  assert.equal(linkDaProposta('abc 123'), '')
  assert.equal(linkDaProposta('"><script>'), '')
  assert.equal(conferirTexto('  oi  '), '')
  assert.equal(conferirTexto('Olá, tudo bem?\r\nSegue o link.'), 'Olá, tudo bem?\nSegue o link.')
  assert.equal(conferirTexto('x'.repeat(1001)), '')
  assert.equal(conferirTexto(42), '')
  assert.equal(finalDoTelefone('+55 (84) 99999-1234'), '•••• 1234')
  assert.equal(finalDoTelefone('123'), '')
})

test('resumo do Telegram: primeiro nome escapado, sem telefone, no máximo 10 linhas', () => {
  const p = (i: number) => ({ id: `card-${i}`, fase: 'Cotações recebidas', placa: 'ABC1D23', nome: i === 0 ? '<b>MARIA</b> SOUZA' : 'JOÃO SILVA', desde: '', dias: 3 + i, veiculo: i === 1 ? 'Fiat Argo 2020' : undefined, enviadoEm: i === 2 ? '2026-11-25T10:00:00Z' : undefined })
  const r = resumoDasParadas([0, 1, 2].map(p), 'https://21go.seg.br/admin#carteira')
  assert.match(r, /Cotações paradas no CRM: 3/)
  assert.match(r, /• Cliente \(ABC1D23\): Cotações recebidas, há 3 dias/)
  assert.match(r, /• João \(ABC1D23 · Fiat Argo 2020\)/)
  assert.match(r, /já chamado pelo painel/)
  assert.doesNotMatch(r, /SILVA|SOUZA/)
  assert.match(r, /admin#carteira$/)
  const muitos = resumoDasParadas(Array.from({ length: 12 }, (_, i) => p(i + 3)), 'x')
  assert.equal(muitos.split('\n').filter((l) => l.startsWith('•')).length, 10)
  assert.match(muitos, /…e mais 2\./)
})
