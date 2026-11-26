// Páginas por cidade: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CIDADES, cidadePorSlug, cidadesPorEstado, cidadesPublicadas, textoProprio } from '../src/lib/cidades.ts'
import { UFS_DA_TABELA } from '../src/lib/tabela-nordeste.ts'

test('slugs únicos, estado da tabela regional e vizinhas que existem', () => {
  const slugs = CIDADES.map((c) => c.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const c of CIDADES) {
    assert.match(c.slug, /^[a-z0-9-]+-(rn|pb|ce)$/)
    assert.ok(c.slug.endsWith(`-${c.uf.toLowerCase()}`), c.slug)
    assert.ok((UFS_DA_TABELA as readonly string[]).includes(c.uf), c.slug)
    assert.match(c.ddd, /^\d{2}$/)
    for (const v of c.vizinhas) assert.ok(slugs.includes(v) && v !== c.slug, `${c.slug} → ${v}`)
    assert.ok(c.faqs.length >= 3, c.slug)
    assert.ok(c.intro.length >= 2, c.slug)
  }
})

test('sem palavra proibida, preço, porcentagem ou "a partir de"', () => {
  for (const c of CIDADES) {
    const t = textoProprio(c)
    assert.doesNotMatch(t, /\bseguros?\b|seguradora|ap[óo]lice|susep|franquia/i, c.slug)
    // Só as porcentagens oficiais do Manual do Consultor 21Go (indenização e cota), sempre "da FIPE".
    const semOficiais = t.replace(/\b(100|80|6|10|15)% d[ao] (Tabela )?FIPE/g, '')
    assert.doesNotMatch(semOficiais, /%|a partir de/i, c.slug)
    // R$ só nos valores fixos dos planos publicados (terceiros), nunca preço de mensalidade.
    for (const m of t.match(/R\$\s?[\d.,]+\s?\w*/g) ?? []) assert.match(m, /R\$ (5|10|50|100) mil/, `${c.slug}: ${m}`)
    // A promoção do VIP é sempre "para carro" quando citada junto com moto.
    if (/moto/i.test(t) && /VIP/.test(t)) assert.match(t, /só para carro|Para carro/i, c.slug)
  }
})

test('cada cidade tem texto próprio (40% ou mais de trechos de 5 palavras só dela)', () => {
  const trechos = (t: string) => {
    const p = t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
    const s = new Set<string>()
    for (let i = 0; i + 5 <= p.length; i++) s.add(p.slice(i, i + 5).join(' '))
    return s
  }
  const todos = CIDADES.map((c) => trechos(textoProprio(c)))
  CIDADES.forEach((c, i) => {
    const outros = new Set<string>()
    todos.forEach((s, j) => j !== i && s.forEach((x) => outros.add(x)))
    const meus = [...todos[i]]
    const unicos = meus.filter((x) => !outros.has(x)).length / meus.length
    assert.ok(unicos >= 0.4, `${c.slug}: só ${Math.round(unicos * 100)}% próprio`)
  })
})

test('buscas e agrupamento', () => {
  assert.equal(cidadePorSlug('natal-rn')?.nome, 'Natal')
  assert.equal(cidadePorSlug('nao-existe'), null)
  const grupos = cidadesPorEstado()
  assert.deepEqual(grupos.map((g) => g.uf), ['RN', 'PB', 'CE'])
  assert.equal(grupos.reduce((n, g) => n + g.cidades.length, 0), cidadesPublicadas().length)
})
