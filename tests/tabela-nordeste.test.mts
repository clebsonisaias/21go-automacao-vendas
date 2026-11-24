// Teste da Tabela Nordeste: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TABELAS_NORDESTE,
  categoriaNordeste,
  cilindrada,
  ehUtilitario,
  estadoPelaPosicao,
  naRegiaoDaTabela,
  normalizarUf,
  precoNordeste,
  regiaoDoComprovante,
  ufDoCep,
  ufDoDdd,
} from '../src/lib/tabela-nordeste.ts'
import { CONTORNOS } from '../src/lib/contornos-tabela.ts'

/** Transcrito à parte, linha por linha, do PDF (FIPE até → total da mensalidade). */
const PDF: Record<string, [number, number][]> = {
  passeio: [
    [10400, 89.4], [20800, 95.4], [31200, 118.4], [36400, 131.4], [41600, 140.4], [46800, 160.5],
    [52000, 176.5], [57200, 186.5], [62400, 195.5], [67600, 205.5], [72800, 216.5], [78000, 235.5],
    [83200, 257.5], [88400, 276.5], [93600, 290.5], [104000, 316.5], [114400, 351.4], [124800, 375.4],
    [135200, 391.4], [145600, 405.4], [156000, 415.4],
  ],
  utilitario: [
    [10400, 117.4], [20800, 123.4], [31200, 145.4], [41600, 167.4], [52000, 203.5], [62400, 224.5],
    [72800, 270.5], [83200, 290.5], [93600, 310.5], [104000, 342.5], [114400, 389.4], [124800, 409.4],
    [135200, 443.31], [145600, 474.22], [156000, 506.45], [166400, 525.4], [176800, 559.4], [187200, 585.4],
    [197600, 610.4], [208000, 635.5], [218400, 651.4], [228800, 671.4], [239200, 696.4], [249600, 718.4],
    [260000, 751.4],
  ],
  moto: [[3500, 36.9], [5000, 41.9], [10000, 62.9], [15000, 71.9], [20000, 81.9], [25000, 96.4], [30000, 107.4]],
  moto_especial: [[25000, 153.9], [30000, 167.9], [35000, 187.9], [40000, 218], [45000, 236], [50000, 254]],
}

test('cada linha das 4 tabelas confere com o PDF', () => {
  for (const [cat, linhas] of Object.entries(PDF)) {
    const t = TABELAS_NORDESTE[cat as keyof typeof TABELAS_NORDESTE]
    assert.equal(t.length, linhas.length, `${cat}: número de faixas`)
    linhas.forEach(([ate, valor], i) => {
      assert.equal(t[i].ate, ate, `${cat} faixa ${i}`)
      assert.equal(t[i].mensalidade, valor, `${cat} faixa ${i}`)
      if (i > 0) assert.equal(t[i].de, Math.round((linhas[i - 1][0] + 0.01) * 100) / 100)
    })
  }
  assert.equal(TABELAS_NORDESTE.moto_especial[0].de, 20000.01)
})

const carro = (modelo: string, fipe: number) => ({ tipo: 'carro' as const, modelo, fipe })
const moto = (modelo: string, fipe: number) => ({ tipo: 'moto' as const, modelo, fipe })

test('limites das faixas', () => {
  assert.equal(precoNordeste(carro('Argo 1.0', 10400))?.mensalidade, 89.4)
  assert.equal(precoNordeste(carro('Argo 1.0', 10400.01))?.mensalidade, 95.4)
  assert.equal(precoNordeste(carro('Argo 1.0', 156000))?.mensalidade, 415.4)
  assert.equal(precoNordeste(carro('Argo 1.0', 156000.01)), null)
  assert.equal(precoNordeste(carro('Argo 1.0', 0)), null)
  assert.equal(precoNordeste(carro('Hilux CD 4x4', 163965))?.mensalidade, 525.4)
  assert.equal(precoNordeste(carro('Hilux CD 4x4', 260000.01)), null)
  assert.equal(precoNordeste(moto('CB 500F', 20000)), null, 'moto acima de 300 cc com FIPE até 20 mil: sem faixa')
  assert.equal(precoNordeste(moto('CB 500F', 30000))?.mensalidade, 167.9)
  assert.equal(precoNordeste(moto('CG 160 FAN', 14000))?.mensalidade, 71.9)
  assert.equal(precoNordeste(moto('CG 160 FAN', 30000.01)), null)
})

test('categoria pelo modelo', () => {
  assert.equal(categoriaNordeste(carro('Hilux CD 4x4 2.8 Diesel Mec.', 1)), 'utilitario')
  assert.equal(categoriaNordeste(carro('Hilux SW4 SR 4x2 2.7', 1)), 'utilitario')
  assert.equal(categoriaNordeste(carro('S10 Pick-Up LTZ 2.8', 1)), 'utilitario')
  assert.equal(categoriaNordeste(carro('Strada Freedom 1.4 Flex 8V CD', 1)), 'passeio')
  assert.equal(categoriaNordeste(carro('ARGO 1.0 6V Flex', 1)), 'passeio')
  assert.equal(categoriaNordeste(carro('RAMPAGE R/T 2.0', 1)), 'utilitario')
  assert.equal(ehUtilitario('Ram 2500 Laramie'), 'Ram')
  assert.equal(ehUtilitario('Rampage Big Horn'), 'Rampage')
  assert.equal(ehUtilitario('Corolla Altis 1.8'), null)
  assert.equal(ehUtilitario('Corolla Cross XRE 2.0'), 'Corolla Cross')
  assert.equal(ehUtilitario('HR-V EX 1.8'), 'HR-V')
  assert.equal(ehUtilitario('Peugeot 208 Active'), null, '"2008" não casa com 208')
  assert.equal(categoriaNordeste(carro('Argo', 1), ['Argo']), 'utilitario', 'lista do admin vale')
  assert.equal(categoriaNordeste(moto('CB 500F/ ABS', 30000)), 'moto_especial')
  assert.equal(categoriaNordeste(moto('XRE 300/ XRE 300 RALLY', 25000)), 'moto')
  assert.equal(categoriaNordeste(moto('CG 160 FAN ESDi', 14000)), 'moto')
  assert.equal(categoriaNordeste(moto('MT-07 689cc', 45000)), 'moto_especial')
  assert.equal(categoriaNordeste(moto('Sem número', 18000)), 'moto')
  assert.equal(categoriaNordeste(moto('MT-03 ABS', 24000)), 'moto_especial', 'sem cilindrada e FIPE acima de 20 mil: especial')
  assert.equal(categoriaNordeste(moto('Sem número', 35000)), 'moto_especial')
  assert.equal(categoriaNordeste({ ...moto('FAT BOY 114', 25000), marca: 'HARLEY-DAVIDSON' }), 'moto_especial')
  assert.equal(cilindrada('S 1000 RR'), 1000)
  assert.equal(cilindrada('CBR 1.000RR'), 1000)
  assert.equal(cilindrada('MT-03'), null)
  assert.equal(ehUtilitario('HRV EXL 1.8'), 'HR-V', 'sem hífen também casa')
  assert.equal(ehUtilitario('X-TRAIL SL 2.5'), 'X-Trail')
  assert.equal(ehUtilitario('ix35 GLS 2.0'), 'ix35')
})

test('UF, DDD e CEP', () => {
  assert.equal(normalizarUf('rn'), 'RN')
  assert.equal(normalizarUf('Rio Grande do Norte'), 'RN')
  assert.equal(normalizarUf('Ceará'), 'CE')
  assert.equal(normalizarUf('XX'), null)
  assert.ok(naRegiaoDaTabela('RN') && naRegiaoDaTabela('pb') && naRegiaoDaTabela('Ceará'))
  assert.ok(!naRegiaoDaTabela('PE'), 'Pernambuco não cola no RN: preço do CRM')
  assert.ok(!naRegiaoDaTabela('BA') && !naRegiaoDaTabela('RJ'))
  assert.equal(ufDoDdd('84999990000'), 'RN')
  assert.equal(ufDoDdd('+55 (21) 99999-0000'), 'RJ')
  assert.equal(ufDoDdd('5598988887777'), 'MA')
  assert.equal(ufDoDdd('123'), null)
  assert.equal(ufDoCep('59280-000'), 'RN')
  assert.equal(ufDoCep('22041-001'), 'RJ')
  assert.equal(ufDoCep('65000-000'), 'MA')
  assert.equal(ufDoCep('123'), null)
})

test('região pelo comprovante', () => {
  assert.deepEqual(regiaoDoComprovante({ uf: 'RN', cep: '59280-000' }), { status: 'regional', uf: 'RN' })
  assert.deepEqual(regiaoDoComprovante({ uf: 'PE', cep: '50030-000' }), { status: 'fora', uf: 'PE' })
  assert.deepEqual(regiaoDoComprovante({ uf: 'RJ', cep: '22041-001' }), { status: 'fora', uf: 'RJ' })
  assert.equal(regiaoDoComprovante({ uf: 'RN', cep: '22041-001' }).status, 'conferir')
  assert.equal(regiaoDoComprovante({ uf: 'RN' }).status, 'conferir')
  assert.equal(regiaoDoComprovante({ cep: '59280-000' }).status, 'conferir')
  assert.equal(regiaoDoComprovante(null).status, 'conferir')
})

test('estado pela localização (só RN, PB e CE)', () => {
  const casos: [string, number, number, string | null][] = [
    ['Natal', -5.79, -35.21, 'RN'],
    ['Mossoró', -5.19, -37.34, 'RN'],
    ['Macaíba', -5.86, -35.35, 'RN'],
    ['João Pessoa', -7.12, -34.86, 'PB'],
    ['Campina Grande', -7.23, -35.88, 'PB'],
    ['Fortaleza', -3.73, -38.52, 'CE'],
    ['Juazeiro do Norte', -7.21, -39.31, 'CE'],
    ['Recife', -8.05, -34.9, null],
    ['Teresina', -5.09, -42.8, null],
    ['Rio de Janeiro', -22.9, -43.2, null],
  ]
  for (const [nome, lat, lng, uf] of casos) assert.equal(estadoPelaPosicao(lat, lng, CONTORNOS), uf, nome)
  assert.equal(estadoPelaPosicao(NaN, 1, CONTORNOS), null)
})
