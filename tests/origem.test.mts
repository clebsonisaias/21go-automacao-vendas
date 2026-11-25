// Origem de cada lead: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canalDe, descreverOrigem, limparOrigem, origemDaVisita, utmParaCrm } from '../src/lib/origem.ts'

test('canal pela fonte do UTM ou pelo site de onde veio', () => {
  assert.equal(canalDe('instagram', undefined, false), 'Instagram')
  assert.equal(canalDe('ig', undefined, false), 'Instagram')
  assert.equal(canalDe(undefined, 'l.instagram.com', false), 'Instagram')
  assert.equal(canalDe('fb', undefined, false), 'Facebook')
  assert.equal(canalDe(undefined, 'm.facebook.com', false), 'Facebook')
  assert.equal(canalDe(undefined, 'google.com.br', false), 'Google')
  assert.equal(canalDe('whatsapp', undefined, false), 'WhatsApp')
  assert.equal(canalDe(undefined, undefined, true), 'Indicação')
  assert.equal(canalDe(undefined, undefined, false), 'Direto')
  assert.equal(canalDe('digital', undefined, false), 'Outro', '"digital" não é Instagram')
  assert.equal(canalDe(undefined, 'bing.com', false), 'Outro')
})

test('visita com UTM, clique do Google e indicação', () => {
  const o = origemDaVisita('https://21go.seg.br/?utm_source=instagram&utm_medium=bio&utm_campaign=black%20friday', null)
  assert.deepEqual(o, { canal: 'Instagram', utm_source: 'instagram', utm_medium: 'bio', utm_campaign: 'black friday', entrada: '/' })
  assert.equal(origemDaVisita('https://21go.seg.br/?gclid=abc', null).canal, 'Google')
  assert.equal(origemDaVisita('https://21go.seg.br/?fbclid=abc', null).canal, 'Facebook')
  assert.equal(origemDaVisita('https://21go.seg.br/?ref=JOAO10', null).canal, 'Indicação')
  assert.equal(origemDaVisita('https://21go.seg.br/', 'https://www.google.com.br/').canal, 'Google')
  // Navegação dentro do próprio site não conta como origem.
  assert.equal(origemDaVisita('https://21go.seg.br/', 'https://21go.seg.br/cliente').canal, 'Direto')
})

test('origem vinda do navegador é limpa e o canal recalculado', () => {
  const o = limparOrigem({
    canal: 'Google',
    utm_source: 'instagram<script>',
    utm_campaign: 'x'.repeat(200),
    referrer: 'javascript:alert(1)',
    entrada: 'sem-barra',
    cpf: '52998224725',
    em: '2026-11-25T10:00:00Z',
  })!
  assert.equal(o.canal, 'Instagram')
  assert.equal(o.utm_source, 'instagramscript')
  assert.equal(o.utm_campaign!.length, 80)
  assert.equal(o.referrer, undefined)
  assert.equal(o.entrada, undefined)
  assert.equal((o as Record<string, unknown>).cpf, undefined, 'campo desconhecido não passa')
  assert.equal(o.em, '2026-11-25T10:00:00.000Z')
  assert.equal(limparOrigem(null), undefined)
  assert.equal(limparOrigem('texto'), undefined)
})

test('parâmetros para o CRM e linha da observação', () => {
  assert.deepEqual(utmParaCrm({ canal: 'Instagram', utm_source: 'instagram', utm_campaign: 'bf' }), { utm_source: 'instagram', utm_campaign: 'bf' })
  assert.deepEqual(utmParaCrm({ canal: 'Google', referrer: 'google.com' }), { utm_source: 'google' })
  assert.deepEqual(utmParaCrm({ canal: 'Direto' }), {})
  assert.deepEqual(utmParaCrm(undefined), {})
  assert.equal(descreverOrigem({ canal: 'Instagram', utm_campaign: 'bf' }), 'Origem: Instagram (campanha bf)')
  assert.equal(descreverOrigem(undefined), 'Origem: não registrada')
})
