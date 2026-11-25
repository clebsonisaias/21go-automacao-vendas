// Texto de compartilhar cupom: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codigoDoLink, linkDoCupom, textoDoCupom } from '../src/lib/cupom-compartilhar.ts'

const NET = { codigo: 'NET21GO', tipo: 'percentual' as const, desconto: 100, maxUsos: null, usos: 3 }

test('texto do NET21GO para os colaboradores da Netgo', () => {
  const t = textoDoCupom(NET, { siteUrl: 'https://21go.seg.br/', paraQuem: 'Colaboradores da Netgo', whatsapp: '55 84 2018-2178' })
  assert.match(t, /^Olá! 👋 Condição especial para colaboradores da Netgo: a proteção veicular da 21Go, com a CITmax, está com \*adesão grátis\* usando o cupom \*NET21GO\*\./)
  assert.match(t, /https:\/\/21go\.seg\.br\/\?cupom=NET21GO#cotacao/)
  assert.match(t, /o cupom já vem preenchido/)
  assert.match(t, /https:\/\/wa\.me\/558420182178/)
  assert.match(t, /a mensalidade segue o plano escolhido\.$/)
  assert.doesNotMatch(t, /seguro/i)
})

test('variações: sem público, valor, porcentagem, validade e usos', () => {
  const v = textoDoCupom({ codigo: 'AMIGO21', tipo: 'valor', desconto: 100, fim: '2026-12-31', maxUsos: 10, usos: 4 }, { siteUrl: 'https://21go.seg.br' })
  assert.match(v, /^Olá! 👋 A proteção veicular/)
  assert.match(v, /R\$\s100,00 de desconto na adesão/)
  assert.match(v, /Vale até 31\/12\/2026 e para 6 cadastros\./)
  assert.doesNotMatch(v, /wa\.me/)
  const p = textoDoCupom({ codigo: 'BLACK10', tipo: 'percentual', desconto: 10, maxUsos: 1, usos: 0 }, { siteUrl: 'https://x', paraQuem: 'Netgo' })
  assert.match(p, /10% de desconto na adesão/)
  assert.match(p, /Condição especial para Netgo:/)
  assert.match(p, /Vale para um cadastro\./)
})

test('código do link e link do cupom', () => {
  assert.equal(codigoDoLink(' net21go '), 'NET21GO')
  assert.equal(codigoDoLink('<script>'), '')
  assert.equal(codigoDoLink(null), '')
  assert.equal(linkDoCupom('https://21go.seg.br//', 'NET21GO'), 'https://21go.seg.br/?cupom=NET21GO#cotacao')
})

test('texto do cupom divulga o plano VIP (para carro, RN, PB e CE), sem preço', () => {
  const t = textoDoCupom(NET, { siteUrl: 'https://21go.seg.br', paraQuem: 'Colaboradores da Netgo' })
  assert.match(t, /💡 Dica: para carro, escolha o plano VIP, que está em promoção para quem mora no RN, na Paraíba e no Ceará\./)
  assert.match(t, /2\. Escolha o plano e faça o cadastro/)
  assert.doesNotMatch(t, /R\$|\d+\s*%/)
})
