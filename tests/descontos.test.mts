// Descontos da mensalidade (pagamento em dia e adesivo): node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escolhaDeDesconto, mensalidadesComDescontos, percentualAdesivo, valorDaEscolha } from '../src/lib/descontos.ts'

/** A conta de antes, escrita à mão, para provar que os planos do CRM não mudaram. */
function antes(planoId: string, fipe: number, elegivel: boolean, monthly: number) {
  let perc = 0
  if (elegivel) perc = ['vip', 'suv', 'especial'].includes(planoId) ? (fipe > 30000 ? 15 : 10) : fipe > 60000 ? 15 : 10
  return {
    pontualidade: Math.round(monthly * 0.95 * 100) / 100,
    adesivo: Math.round(monthly * (1 - perc / 100) * 0.95 * 100) / 100,
  }
}

test('percentual do adesivo por plano e FIPE', () => {
  assert.equal(percentualAdesivo('vip', 51919, true), 15)
  assert.equal(percentualAdesivo('vip', 25000, true), 10)
  assert.equal(percentualAdesivo('basico', 51919, true), 10)
  assert.equal(percentualAdesivo('basico', 70000, true), 15)
  assert.equal(percentualAdesivo('vip', 51919, false), 0, 'moto, elétrico e híbrido: sem adesivo')
})

test('tabela regional: valor normal com os descontos por cima', () => {
  assert.deepEqual(mensalidadesComDescontos(176.5, 15), { pontualidade: 167.68, adesivo: 142.52 })
  assert.deepEqual(mensalidadesComDescontos(176.5, 10), { pontualidade: 167.68, adesivo: 150.91 })
  assert.deepEqual(mensalidadesComDescontos(176.5, 0), { pontualidade: 167.68, adesivo: 167.68 })
})

test('planos do CRM: o mesmo resultado da conta de antes', () => {
  for (const [id, fipe, eleg, m] of [
    ['vip', 51919, true, 269.53],
    ['basico', 51919, true, 213.15],
    ['do-seu-jeito', 85000, true, 225.79],
    ['premium', 51919, false, 359.74],
    ['suv', 29000, true, 401.11],
  ] as const) {
    const { pontualidade, adesivo } = mensalidadesComDescontos(m, percentualAdesivo(id, fipe, eleg))
    assert.deepEqual({ pontualidade, adesivo }, antes(id, fipe, eleg, m), `${id} ${fipe}`)
  }
})

test('escolha do cliente pelo valor gravado', () => {
  const o = { normal: 176.5, pontualidade: 167.68, adesivo: 142.52 }
  assert.equal(escolhaDeDesconto(142.52, o), 'adesivo')
  assert.equal(escolhaDeDesconto(167.68, o), 'pontualidade')
  assert.equal(escolhaDeDesconto(176.5, o), 'normal')
  assert.equal(escolhaDeDesconto(100, o), null)
  // Sem adesivo elegível os dois valores são iguais: vale pagamento em dia.
  assert.equal(escolhaDeDesconto(167.68, { normal: 176.5, pontualidade: 167.68, adesivo: 167.68 }), 'pontualidade')
  assert.equal(valorDaEscolha('adesivo', o), 142.52)
  assert.equal(valorDaEscolha('normal', o), 176.5)
})
