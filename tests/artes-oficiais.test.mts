// Artes oficiais do CRM: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatoPeloNome, lerArquivos, tituloDaArte } from '../src/lib/artes-oficiais.ts'
import { problemasDaLegenda } from '../src/lib/arte-regras.ts'

test('formato e título pelo nome do arquivo', () => {
  assert.equal(formatoPeloNome('Feliz aniversário (story 1080x1920).png'), 'story')
  assert.equal(formatoPeloNome('21go-vidros-feed.png'), 'feed')
  assert.equal(formatoPeloNome('arte 9x16.png'), 'story')
  assert.equal(tituloDaArte('21go-carro-reserva-feed.png'), 'Carro reserva')
  assert.equal(tituloDaArte('21go-roubo-e-furto-feed-2.png'), 'Roubo e furto')
  assert.equal(tituloDaArte('Feliz aniversário (feed 1080x1080).png'), 'Feliz aniversário')
})

test('lista do CRM: só imagem com id e URL https', () => {
  const r = lerArquivos({
    arquivos: [
      { id: 'aaaaaaaa-1111', nome: '21go-vidros-feed.png', mime: 'image/png', tamanho: 10, url: 'https://x.supabase.co/storage/v1/object/sign/a.png?token=t', tipo: 'imagem' },
      { id: 'bbbbbbbb-2222', nome: 'manual.pdf', mime: 'application/pdf', url: 'https://x.supabase.co/a.pdf' },
      { id: 'cccccccc-3333', nome: 'sem-https.png', mime: 'image/png', url: 'http://x/a.png' },
      { id: '../x', nome: 'id-ruim.png', mime: 'image/png', url: 'https://x/a.png' },
      { id: 'dddddddd-4444', nome: 'Aniversário (story 1080x1920).png', mime: 'image/png', url: 'https://x/b.png' },
    ],
  })
  assert.deepEqual(r.map((a) => [a.id, a.formato]), [['aaaaaaaa-1111', 'feed'], ['dddddddd-4444', 'story']])
  assert.equal(lerArquivos(null).length, 0)
})

test('legenda: regras do manual e limite da Meta', () => {
  assert.deepEqual(problemasDaLegenda('Carro parou? Com o carro reserva você segue rodando. Cote pela placa no link da bio.'), [])
  assert.match(problemasDaLegenda('curta').join(), /Escreva a legenda/)
  assert.match(problemasDaLegenda('O melhor seguro do RN, cote no link da bio agora.').join(), /seguro/)
  assert.match(problemasDaLegenda('Planos a partir de R$ 99 por mês, cote no link da bio.').join(), /Preço/)
  assert.match(problemasDaLegenda('Proteja seu Onix com a 21Go, cote no link da bio.').join(), /Marca/)
  assert.match(problemasDaLegenda('Legenda com hashtags demais ' + Array.from({ length: 31 }, (_, i) => `#t${i}`).join(' ')).join(), /30/)
  assert.match(problemasDaLegenda('x'.repeat(2201)).join(), /2\.200/)
})

import { limparLegendaDaIa, montarLegenda, promptDaLegenda } from '../src/lib/legenda-ia-regras.ts'
import { CTA, TAGS, fatosDoSite } from '../src/lib/social-content.ts'

test('IA da legenda: o prompt leva os fatos do site e as regras', () => {
  const fatos = fatosDoSite()
  assert.ok(fatos.length >= 5)
  assert.ok(fatos.every((f) => !f.includes('#') && !f.includes(CTA)))
  const p = promptDaLegenda(fatos)
  assert.match(p, /Rio Grande do Norte/)
  assert.match(p, /nunca use a palavra "seguro"/)
  assert.match(p, /20\+ anos no Rio/)
  assert.ok(fatos.every((f) => p.includes(f)))
  assert.doesNotMatch(p, /recusada/)
  assert.match(promptDaLegenda(fatos, ['O post não chama o produto de "seguro".']), /recusada por: O post não chama/)
})

test('IA da legenda: confere a resposta e monta a legenda que passa no manual', () => {
  const r = limparLegendaDaIa(
    {
      texto: `Aqui não tem análise de perfil: o que conta é o veículo. 🚗 #21go https://x.com\n\n${CTA}`,
      alertas: ['A arte cita o Rio ("20+ anos no Rio"); a CITmax atende no RN.', '', 42, 'x'.repeat(300)],
    },
    CTA
  )
  assert.ok(r)
  assert.equal(r.texto, 'Aqui não tem análise de perfil: o que conta é o veículo. 🚗')
  assert.equal(r.alertas.length, 2)
  assert.equal(r.alertas[1].length, 200)
  const legenda = montarLegenda(r.texto, CTA, TAGS)
  assert.deepEqual(problemasDaLegenda(legenda), [])
  assert.equal(limparLegendaDaIa({ texto: 'curto' }), null)
  assert.equal(limparLegendaDaIa({ texto: 'x'.repeat(401) }), null)
  assert.equal(limparLegendaDaIa('não é json'), null)
  assert.deepEqual(limparLegendaDaIa({ texto: 'Texto sem alertas, mas válido.' })?.alertas, [])
})

import { SOCIAL_CONTENT, SOCIAL_ONE_OFFS } from '../src/lib/social-content.ts'

test('VIP: posts que falam de plano citam o VIP; moto e cobertura ficam como estavam', () => {
  const todos = [...SOCIAL_CONTENT, ...SOCIAL_ONE_OFFS]
  const comVip = ['cotacao-online', '27-11-capa-reels-30s', '07-12-seu-nome-nao-importa', '23-12-o-que-a-protecao-cobre']
  for (const id of comVip) {
    const c = todos.find((x) => x.id === id)
    assert.ok(c, id)
    assert.match(c.caption, /Para carro, o destaque é o plano VIP, em promoção para quem mora no RN, na Paraíba e no Ceará\./, id)
    assert.deepEqual(problemasDaLegenda(c.caption), [], id)
  }
  for (const id of ['motos', '18-12-moto', 'roubo-furto', 'colisao', '16-12-chuva-forte']) {
    const c = todos.find((x) => x.id === id)
    assert.ok(c, id)
    assert.doesNotMatch(c.caption, /VIP/, id)
  }
  assert.ok(fatosDoSite().some((f) => /plano VIP/.test(f)))
  assert.match(promptDaLegenda(fatosDoSite()), /Se a legenda falar de plano, cite o plano VIP/)
})
