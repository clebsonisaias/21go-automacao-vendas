// Teste da reserva do OpenRouter: node --experimental-strip-types --no-warnings --test tests/
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  MODELOS_GRATUITOS,
  conversarOpenRouter,
  modelosOpenRouter,
  textoDaResposta,
} from '../src/lib/openrouter.ts'

test('modelos: lista do ambiente ou os gratuitos', () => {
  assert.deepEqual(modelosOpenRouter(undefined), MODELOS_GRATUITOS)
  assert.deepEqual(modelosOpenRouter(''), MODELOS_GRATUITOS)
  assert.deepEqual(modelosOpenRouter(' a/b:free , openrouter/free ,lixo, '), ['a/b:free', 'openrouter/free'])
})

test('texto: só o content, nunca o raciocínio', () => {
  assert.equal(textoDaResposta({ choices: [{ message: { content: '  Oi  ' } }] }), 'Oi')
  assert.equal(textoDaResposta({ choices: [{ message: { content: null, reasoning: 'thinking...' } }] }), '')
  assert.equal(textoDaResposta(null), '')
})

// OpenRouter falso: responde conforme o modelo pedido e guarda o que recebeu.
const pedidos: { model: string; auth: string; messages: unknown; reasoning: unknown }[] = []
const servidor = http.createServer((req, res) => {
  let corpo = ''
  req.on('data', (c) => (corpo += c))
  req.on('end', () => {
    const d = JSON.parse(corpo)
    pedidos.push({ model: d.model, auth: String(req.headers.authorization), messages: d.messages, reasoning: d.reasoning })
    const enviar = (status: number, json: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(json))
    }
    if (d.model === 'lotado/m:free') return enviar(429, { error: { message: 'rate limited' } })
    if (d.model === 'vazio/m:free') return enviar(200, { choices: [{ message: { content: '', reasoning: 'hmm' } }] })
    if (d.model === 'semchave/m:free') return enviar(401, { error: { message: 'no auth' } })
    enviar(200, { choices: [{ message: { content: `Resposta de ${d.model}` } }] })
  })
})
await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r))
process.env.OPENROUTER_API_URL = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/`
after(() => servidor.close())

test('pula o modelo lotado e o vazio, usa o seguinte', async () => {
  process.env.OPENROUTER_API_KEY = 'chave-de-teste'
  process.env.OPENROUTER_MODELS = 'lotado/m:free,vazio/m:free,bom/m:free'
  pedidos.length = 0
  const r = await conversarOpenRouter([{ role: 'user', content: 'Oi' }])
  assert.deepEqual(r, { texto: 'Resposta de bom/m:free', modelo: 'bom/m:free' })
  assert.deepEqual(pedidos.map((p) => p.model), ['lotado/m:free', 'vazio/m:free', 'bom/m:free'])
  assert.equal(pedidos[0].auth, 'Bearer chave-de-teste')
  assert.deepEqual(pedidos[0].reasoning, { effort: 'low', exclude: true })
})

test('chave recusada para na hora, sem tentar os outros', async () => {
  process.env.OPENROUTER_MODELS = 'semchave/m:free,bom/m:free'
  pedidos.length = 0
  await assert.rejects(conversarOpenRouter([{ role: 'user', content: 'Oi' }]), /HTTP 401/)
  assert.deepEqual(pedidos.map((p) => p.model), ['semchave/m:free'])
})

test('respeita o prazo total: não começa outro modelo sem tempo', async () => {
  process.env.OPENROUTER_API_KEY = 'chave-de-teste'
  process.env.OPENROUTER_MODELS = 'lotado/m:free,bom/m:free'
  pedidos.length = 0
  await assert.rejects(
    conversarOpenRouter([{ role: 'user', content: 'Oi' }], { prazoTotalMs: 2_000 }),
    /sem tempo/
  )
  assert.equal(pedidos.length, 0)
})

test('sem chave não chama nada', async () => {
  delete process.env.OPENROUTER_API_KEY
  pedidos.length = 0
  await assert.rejects(conversarOpenRouter([{ role: 'user', content: 'Oi' }]), /OPENROUTER_API_KEY/)
  assert.equal(pedidos.length, 0)
})
