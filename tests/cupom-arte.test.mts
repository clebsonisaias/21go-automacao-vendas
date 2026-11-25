// Arte do cupom: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conteudoDaArte, limparTextosDaIa, problemasDaArte, promptDaArteDoCupom, textosPadraoDoCupom } from '../src/lib/cupom-arte.ts'
import { problemasDoTexto } from '../src/lib/arte-regras.ts'

const NET = { codigo: 'NET21GO', tipo: 'percentual' as const, desconto: 100, maxUsos: null, usos: 0 }

test('texto padrão: adesão grátis e o público; sem número no desconto parcial', () => {
  const t = textosPadraoDoCupom(NET, 'Colaboradores da Netgo')
  assert.deepEqual(t, { titulo: 'Adesão grátis para você', destaque: 'Adesão grátis', subtitulo: 'Condição especial para colaboradores da Netgo.' })
  assert.deepEqual(problemasDaArte('NET21GO', t, problemasDoTexto), [])
  const dez = textosPadraoDoCupom({ tipo: 'percentual', desconto: 10 })
  assert.equal(dez.titulo, 'Desconto na adesão para você')
  assert.doesNotMatch(JSON.stringify(dez), /\d+\s*%|R\$/)
  assert.deepEqual(problemasDaArte('BLACK10', dez, problemasDoTexto), [])
})

test('conteúdo no modelo do manual: etiqueta, passo a passo com o código e fundo', () => {
  const c = conteudoDaArte('NET21GO', textosPadraoDoCupom(NET), 'laranja')
  assert.equal(c.etiqueta, 'CUPOM NET21GO')
  assert.equal(c.fundo, 'laranja')
  assert.equal(c.miolo?.tipo, 'cards')
  assert.match(JSON.stringify(c.miolo), /Use o cupom NET21GO/)
})

test('regras: preço, porcentagem, seguro, título longo, destaque fora do título, emoji', () => {
  const base = textosPadraoDoCupom(NET)
  const p = (t: Partial<typeof base>) => problemasDaArte('NET21GO', { ...base, ...t }, problemasDoTexto).join(' ')
  assert.match(p({ subtitulo: 'Desconto de 50% na adesão.' }), /porcentagem/)
  assert.match(p({ titulo: 'Adesão por R$ 0 hoje' }), /Preço/)
  assert.match(p({ subtitulo: 'O melhor seguro do RN.' }), /seguro/)
  assert.match(p({ titulo: 'Agora você tem adesão grátis na proteção da 21Go hoje' }), /8/)
  assert.match(p({ destaque: 'Mensalidade' }), /destaque/)
  assert.match(p({ subtitulo: 'Especial para vocês 🚗' }), /emoji/)
  assert.match(p({ subtitulo: 'x'.repeat(111) }), /110/)
})

test('resposta da IA e prompt', () => {
  assert.deepEqual(limparTextosDaIa({ titulo: ' Adesão grátis na Netgo #21go ', destaque: 'Adesão grátis', subtitulo: 'Para os colaboradores da Netgo.' }), {
    titulo: 'Adesão grátis na Netgo',
    destaque: 'Adesão grátis',
    subtitulo: 'Para os colaboradores da Netgo.',
  })
  assert.equal(limparTextosDaIa({ titulo: '' , subtitulo: 'x' }), null)
  assert.equal(limparTextosDaIa('texto'), null)
  const pr = promptDaArteDoCupom(NET, 'Colaboradores da Netgo', ['Título longo.'])
  assert.match(pr, /cupom NET21GO, que dá adesão grátis/)
  assert.match(pr, /colaboradores da Netgo|Colaboradores da Netgo/)
  assert.match(pr, /recusada por: Título longo/)
})
