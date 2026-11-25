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
