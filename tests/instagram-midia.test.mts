// Parâmetros do envio ao Instagram: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esperaDoProcessamento, paramsDaMidia } from '../src/lib/instagram-midia.ts'

test('imagem: feed com legenda, story sem legenda', () => {
  const img = { tipo: 'imagem' as const, url: 'https://21go.seg.br/a.jpg' }
  assert.deepEqual(paramsDaMidia(img, 'feed', 'Oi'), { image_url: img.url, caption: 'Oi' })
  assert.deepEqual(paramsDaMidia(img, 'story', 'Oi'), { image_url: img.url, media_type: 'STORIES' })
})

test('vídeo: Reel no feed (com legenda e na grade) e story', () => {
  const v = { tipo: 'video' as const, url: 'https://21go.seg.br/social/video/x.mp4' }
  assert.deepEqual(paramsDaMidia(v, 'feed', 'Oi'), { video_url: v.url, media_type: 'REELS', caption: 'Oi', share_to_feed: 'true' })
  assert.deepEqual(paramsDaMidia(v, 'story', 'Oi'), { video_url: v.url, media_type: 'STORIES' })
  assert.ok(esperaDoProcessamento(v).tentativas * esperaDoProcessamento(v).intervaloMs >= 5 * 60_000)
  assert.equal(esperaDoProcessamento({ tipo: 'imagem', url: 'x' }).tentativas, 12)
})
