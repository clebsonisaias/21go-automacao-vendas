import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promoAdesaoAtiva } from '../src/lib/promo-adesao.ts'

test('promo vale só no dia 27/11/2026 em Brasília', () => {
  assert.equal(promoAdesaoAtiva(new Date('2026-11-27T03:00:00Z')), true) // 00:00 BRT
  assert.equal(promoAdesaoAtiva(new Date('2026-11-28T02:59:59Z')), true) // 23:59:59 BRT
  assert.equal(promoAdesaoAtiva(new Date('2026-11-28T03:00:00Z')), false)
  assert.equal(promoAdesaoAtiva(new Date('2026-11-27T02:59:59Z')), false)
})

test('promo baixa a adesão para R$ 1, sem subir adesão menor', async () => {
  const { adesaoPromo } = await import('../src/lib/promo-adesao.ts')
  assert.equal(adesaoPromo(299.9), 1)
  assert.equal(adesaoPromo(1), 1)
  assert.equal(adesaoPromo(0), 0)
  assert.equal(adesaoPromo(0.5), 0.5)
})

test('fora do dia da promoção, a adesão não muda (só o teste de hora decide)', () => {
  assert.equal(promoAdesaoAtiva(new Date('2026-11-26T15:00:00Z')), false)
  assert.equal(promoAdesaoAtiva(new Date('2026-11-27T15:00:00Z')), true)
})
