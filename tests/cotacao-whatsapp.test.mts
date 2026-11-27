// "Receber esta cotação no WhatsApp": node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  casaComLead,
  cotacaoRepetida,
  cotacoesParaEquipe,
  dentroDoHorario,
  excedeuNumero,
  lembreteDevido,
  linkDeRetomada,
  mensagemSugerida,
  normalizarCelular,
  paramsDoTemplate,
  reais,
  semAsAntigas,
  textoDaMensagem,
  tokenValido,
  validarPedido,
  type CotacaoWhatsApp,
} from '../src/lib/cotacao-whatsapp.ts'
import { ufDoDdd } from '../src/lib/tabela-nordeste.ts'

// A mesma regra do atendai.ts (DDD + 8 últimos dígitos), aqui para o teste não carregar fs.
const chave = (t: string) => {
  let d = String(t || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  return d.length < 10 ? null : `${d.slice(0, 2)}${d.slice(-8)}`
}

const agora = Date.parse('2026-11-25T15:00:00.000Z') // 12h em Brasília
const h = (n: number) => new Date(agora - n * 3600_000).toISOString()

const cot = (extra: Partial<CotacaoWhatsApp> = {}): CotacaoWhatsApp => ({
  id: 'cw_1',
  token: 'a'.repeat(32),
  criadaEm: h(25),
  expiraEm: h(-700),
  whatsapp: '84999998888',
  placa: 'ABC1D23',
  uf: 'RN',
  pedido: { tipo: 'carro', brandId: '1', brandText: 'Fiat', modelId: '2', modelText: 'Argo', year: '2020-1', codFipe: '001' },
  veiculo: { marca: 'Fiat', modelo: 'Argo 1.0', ano: '2020', fipeValue: 51919 },
  plano: { id: 'vip', nome: 'VIP', mensalidade: 167.68, ativacao: 276.5, regional: true },
  consentimento: { versao: 'cotacao-whatsapp-v1', em: h(25) },
  envios: [{ em: h(25), tipo: 'cotacao', ok: true }],
  lembretes: [],
  ...extra,
})

test('celular: com ou sem 55 e máscara; fixo e DDD inexistente são recusados', () => {
  assert.equal(normalizarCelular('(84) 99999-8888', ufDoDdd), '84999998888')
  assert.equal(normalizarCelular('+55 84 99999-8888', ufDoDdd), '84999998888')
  assert.equal(normalizarCelular('5584999998888', ufDoDdd), '84999998888')
  assert.equal(normalizarCelular('(84) 3222-8888', ufDoDdd), null) // fixo
  assert.equal(normalizarCelular('(20) 99999-8888', ufDoDdd), null) // DDD 20 não existe
  assert.equal(normalizarCelular('9999-8888', ufDoDdd), null)
  assert.equal(normalizarCelular(undefined, ufDoDdd), null)
})

test('pedido: só os dados do veículo, com os obrigatórios', () => {
  const ok = validarPedido({ tipo: 'moto', brandId: 1, brandText: 'Honda', modelId: 2, modelText: 'CG', year: '2021', codFipe: '811' })
  assert.equal(typeof ok, 'object')
  assert.equal((ok as any).tipo, 'moto')
  assert.equal((ok as any).brandId, '1')
  assert.equal(typeof validarPedido({ brandId: '1', modelId: '2', year: '3' }), 'string') // sem codFipe
  assert.equal(typeof validarPedido({ tipo: 'caminhao', brandId: '1', modelId: '2', year: '3', codFipe: '4' }), 'string')
  assert.equal(typeof validarPedido(null), 'string')
})

test('token e link: 32 caracteres e nenhuma placa na URL', () => {
  assert.equal(tokenValido('a'.repeat(32)), true)
  assert.equal(tokenValido('a'.repeat(31)), false)
  assert.equal(tokenValido('a'.repeat(31) + '/'), false)
  const url = linkDeRetomada('https://21go.seg.br/', 'b'.repeat(32))
  assert.equal(url, `https://21go.seg.br/?cotacao=${'b'.repeat(32)}#cotacao`)
  assert.doesNotMatch(url, /ABC1D23/)
})

test('lembretes: 24 h, 72 h com 48 h entre eles, no máximo 2', () => {
  assert.equal(lembreteDevido(cot({ criadaEm: h(23) }), agora, { jaCadastrou: false }), null)
  assert.equal(lembreteDevido(cot({ criadaEm: h(24) }), agora, { jaCadastrou: false }), 1)
  assert.equal(lembreteDevido(cot({ criadaEm: h(71), lembretes: [h(47)] }), agora, { jaCadastrou: false }), null)
  assert.equal(lembreteDevido(cot({ criadaEm: h(72), lembretes: [h(30)] }), agora, { jaCadastrou: false }), null) // 1º há só 30 h
  assert.equal(lembreteDevido(cot({ criadaEm: h(72), lembretes: [h(48)] }), agora, { jaCadastrou: false }), 2)
  assert.equal(lembreteDevido(cot({ criadaEm: h(200), lembretes: [h(100), h(50)] }), agora, { jaCadastrou: false }), null)
})

test('lembretes param: cadastrou, respondeu, parou, não recebeu, antiga', () => {
  assert.equal(lembreteDevido(cot(), agora, { jaCadastrou: true }), null)
  assert.equal(lembreteDevido(cot({ fechadaEm: h(1) }), agora, { jaCadastrou: false }), null)
  assert.equal(lembreteDevido(cot({ respondeuEm: h(1) }), agora, { jaCadastrou: false }), null)
  assert.equal(lembreteDevido(cot({ paradaEm: h(1) }), agora, { jaCadastrou: false }), null)
  assert.equal(lembreteDevido(cot({ envios: [{ em: h(25), tipo: 'cotacao', ok: false }] }), agora, { jaCadastrou: false }), null)
  assert.equal(lembreteDevido(cot({ criadaEm: h(24 * 8) }), agora, { jaCadastrou: false }), null) // 1º depois de 7 dias não sai
  assert.equal(lembreteDevido(cot({ criadaEm: h(24 * 31), lembretes: [h(24 * 29)] }), agora, { jaCadastrou: false }), null)
  // Conversa aberta no 1º lembrete = a pessoa escreveu: o 2º não sai.
  const respondeu = cot({ criadaEm: h(80), lembretes: [h(56)], envios: [{ em: h(80), tipo: 'cotacao', ok: true }, { em: h(56), tipo: 'lembrete', ok: true, janela: true }] })
  assert.equal(lembreteDevido(respondeu, agora, { jaCadastrou: false }), null)
})

test('horário dos lembretes: das 9h às 19h59 de Brasília', () => {
  assert.equal(dentroDoHorario(new Date('2026-11-25T11:59:00.000Z')), false) // 08:59
  assert.equal(dentroDoHorario(new Date('2026-11-25T12:00:00.000Z')), true) // 09:00
  assert.equal(dentroDoHorario(new Date('2026-11-25T22:59:00.000Z')), true) // 19:59
  assert.equal(dentroDoHorario(new Date('2026-11-25T23:00:00.000Z')), false) // 20:00
})

test('mensagens: valores do servidor, sem "seguro", promoção só para carro regional', () => {
  const c = cot()
  const url = linkDeRetomada('https://21go.seg.br', c.token)
  for (const etapa of ['cotacao', 'lembrete1', 'lembrete2'] as const) {
    const t = textoDaMensagem(c, url, etapa)
    assert.doesNotMatch(t, /\bseguros?\b|susep/i)
    assert.match(t, /167,68/)
    assert.ok(t.includes(url))
  }
  assert.match(textoDaMensagem(c, url, 'cotacao'), /promoção na tabela regional/)
  assert.match(textoDaMensagem(c, url, 'cotacao'), /consultor autorizado/)
  const moto = cot({ pedido: { ...c.pedido, tipo: 'moto' } })
  assert.doesNotMatch(textoDaMensagem(moto, url, 'cotacao'), /promoção/)
  assert.doesNotMatch(textoDaMensagem(cot({ plano: { ...c.plano, regional: false } }), url, 'cotacao'), /promoção/)
  assert.deepEqual(paramsDoTemplate(c, url), ['Fiat Argo 1.0 2020', 'VIP', '167,68', '276,50', url])
  assert.equal(reais(1234.5), '1.234,50')
  // Black 21Go: a adesão da promoção, com o prazo e o valor de fora dela; os lembretes não falam de adesão.
  const black = cot({ plano: { ...c.plano, promoAdesao: 1, promoAte: '2026-11-28T02:59:59.999Z', promoDia: '27/11' } })
  const naBlack = new Date('2026-11-27T20:00:00Z')
  const depois = new Date('2026-11-28T12:00:00Z')
  assert.match(textoDaMensagem(black, url, 'cotacao', naBlack), /Adesão \(Pix único\): R\$ 1,00 na Black 21Go, para cadastro feito até 23h59 de hoje, 27\/11 \(sem a promoção, R\$ 276,50\)/)
  assert.equal(paramsDoTemplate(black, url, naBlack)[3], '1,00 na Black 21Go, para cadastro feito até 23h59 de hoje, 27/11 (sem a promoção, R$ 276,50)')
  // Depois do fim (lembrete pelo template de reserva, reenvio): volta à adesão cheia.
  assert.equal(paramsDoTemplate(black, url, depois)[3], '276,50')
  assert.doesNotMatch(textoDaMensagem(black, url, 'cotacao', depois), /Black/)
  assert.doesNotMatch(textoDaMensagem(black, url, 'lembrete1', naBlack), /Black|1,00/)
  // Sem desconto de pontualidade, não diz "pagando em dia".
  const semDesconto = cot({ plano: { ...c.plano, emDia: false } })
  assert.doesNotMatch(textoDaMensagem(semDesconto, url, 'cotacao'), /pagando em dia/)
  assert.match(textoDaMensagem(c, url, 'cotacao'), /pagando em dia/)
  assert.match(textoDaMensagem(c, url, 'lembrete2'), /último lembrete automático/)
  assert.doesNotMatch(mensagemSugerida(c), /\bseguros?\b/i)
  assert.match(mensagemSugerida(c), /\[link da cotação\]/)
})

test('o cadastro fecha a cotação: mesma placa ou mesmo WhatsApp, depois da cotação', () => {
  const c = cot()
  assert.equal(casaComLead(c, { status: 'pendente_vistoria', createdAt: h(1), placa: 'abc-1d23' }, chave), true)
  assert.equal(casaComLead(c, { status: 'pendente_vistoria', createdAt: h(1), whatsapp: '(84) 9999-8888' }, chave), true) // sem o 9
  assert.equal(casaComLead(c, { status: 'pendente_vistoria', createdAt: h(1), atendaiTelefone: '5584999998888', whatsapp: '11911112222' }, chave), true)
  assert.equal(casaComLead(c, { status: 'cancelado', createdAt: h(1), placa: 'ABC1D23' }, chave), false)
  assert.equal(casaComLead(c, { status: 'pendente_vistoria', createdAt: h(100), placa: 'ABC1D23' }, chave), false) // antes da cotação
  assert.equal(casaComLead(c, { status: 'pendente_vistoria', createdAt: h(1), placa: 'XYZ9A88', whatsapp: '84988887777' }, chave), false)
})

test('repetição e limite por número', () => {
  const lista = [cot({ criadaEm: h(2) })]
  assert.ok(cotacaoRepetida(lista, '5584999998888', '001', agora, chave))
  assert.equal(cotacaoRepetida(lista, '84999998888', '999', agora, chave), null) // outro veículo
  assert.equal(cotacaoRepetida([cot({ criadaEm: h(25) })], '84999998888', '001', agora, chave), null) // mais de 24 h
  assert.equal(excedeuNumero([cot({ criadaEm: h(2) }), cot({ criadaEm: h(50) })], '84999998888', agora, chave), false)
  assert.equal(excedeuNumero([cot({ criadaEm: h(2) }), cot({ criadaEm: h(50) }), cot({ criadaEm: h(100) })], '84999998888', agora, chave), true)
  assert.equal(excedeuNumero([cot({ criadaEm: h(24 * 8) }), cot({ criadaEm: h(24 * 9) }), cot({ criadaEm: h(2) })], '84999998888', agora, chave), false)
  assert.equal(semAsAntigas([cot({ criadaEm: h(24 * 91) }), cot()], agora).length, 1)
})

test('quadro da equipe: sem as fechadas, mais novas primeiro, só os 4 últimos dígitos', () => {
  const lista = [
    cot({ id: 'a', criadaEm: h(30) }),
    cot({ id: 'b', criadaEm: h(5), envios: [{ em: h(5), tipo: 'cotacao', ok: false }] }),
    cot({ id: 'c', criadaEm: h(10), fechadaEm: h(2) }),
    cot({ id: 'd', criadaEm: h(80), lembretes: [h(50)], abertaEm: h(40) }),
    cot({ id: 'e', criadaEm: h(24 * 40) }),
  ]
  const q = cotacoesParaEquipe(lista, agora)
  assert.deepEqual(q.map((x) => x.id), ['b', 'a', 'd'])
  assert.equal(q[0].situacao, 'nao_recebeu')
  assert.equal(q[1].situacao, 'aguardando')
  assert.equal(q[2].situacao, 'lembretes_enviados')
  assert.equal(q[2].abriuLink, true)
  assert.equal(q[1].telefoneFinal, '8888')
  assert.equal(JSON.stringify(q).includes('99999'), false)
  assert.equal(JSON.stringify(q).includes('a'.repeat(32)), false) // o token não vai ao painel
  // Mensagem da equipe há menos de 24 h: o botão espera.
  const comMsg = cotacoesParaEquipe([cot({ envios: [{ em: h(25), tipo: 'cotacao', ok: true }, { em: h(3), tipo: 'equipe', ok: true }] })], agora)
  assert.equal(comMsg[0].podeMensagem, false)
})
