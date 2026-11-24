// Leitura de documento pelo texto do PDF, sem IA: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpfValido, lerTextoDoDocumento, renavamValido } from '../src/lib/documento-pdf.ts'
import { LINHAS_CRLV } from './pdf-sintetico.mts'

const CRLV = LINHAS_CRLV.join('\n')

const CNH_NOVA = [
  'REPÚBLICA FEDERATIVA DO BRASIL',
  'CARTEIRA NACIONAL DE HABILITAÇÃO',
  '2 e 1 NOME E SOBRENOME',
  'MARIA DAS GRAÇAS SOUZA',
  '3 DATA, LOCAL E UF DE NASCIMENTO',
  '01/02/1990, NATAL, RN',
  '4d CPF                5 Nº REGISTRO',
  '111.444.777-35        98765432103',
  'FILIAÇÃO',
  'JOSÉ DE SOUZA',
  'ANA MARIA SOUZA',
].join('\n')

const CNH_ANTIGA = [
  'CARTEIRA NACIONAL DE HABILITAÇÃO',
  'NOME',
  'JOÃO PEDRO DA SILVA',
  'DOC. IDENTIDADE / ÓRG. EMISSOR / UF',
  '001234567 SSP RN',
  'CPF                    DATA NASCIMENTO',
  '529.982.247-25         10/10/1985',
].join('\n')

const CONTA = [
  'COSERN - Companhia Energética do Rio Grande do Norte',
  'NOTA FISCAL / CONTA DE ENERGIA ELÉTRICA',
  'CLIENTE',
  'FULANO DE TAL',
  'RUA DAS FLORES, 123 - CENTRO',
  'CENTRO - MACAÍBA - RN    CEP: 59280-000',
  'CONSUMO kWh 150',
].join('\n')

test('validadores', () => {
  assert.ok(cpfValido('529.982.247-25') && cpfValido('11144477735'))
  assert.ok(!cpfValido('52998224724') && !cpfValido('11111111111'))
  assert.ok(renavamValido('01234567897') && renavamValido('00639884962'))
  assert.ok(!renavamValido('01234567890') && !renavamValido('00000000000'))
})

test('CRLV: placa, chassi e renavam', () => {
  const r = lerTextoDoDocumento(CRLV)
  assert.deepEqual(r.parsed, {
    documentType: 'crlv',
    vehicle: { placa: 'QWE1A23', chassi: '9BWZZZ377VT004251', renavam: '01234567897' },
  })
  assert.equal(lerTextoDoDocumento(CRLV, 'crlv').parsed?.documentType, 'crlv')
})

test('CRLV: duas placas (placa anterior) vai para a IA', () => {
  const r = lerTextoDoDocumento(`${CRLV}\nPLACA ANTERIOR / UF\nQWE1234/RN`)
  assert.equal(r.parsed, null)
  assert.equal(r.motivo, 'mais de uma placa')
})

test('CRLV: renavam ambíguo fica de fora, o resto continua', () => {
  // 00639884962 também é um CPF válido: não conta como renavam.
  assert.equal(lerTextoDoDocumento(`${CRLV}\n00639884962`).parsed?.vehicle?.renavam, '01234567897')
  const r = lerTextoDoDocumento(`${CRLV}\nCODIGO DE SEGURANCA\n00000000019`)
  assert.equal(r.parsed?.vehicle?.placa, 'QWE1A23')
  assert.equal(r.parsed?.vehicle?.renavam, undefined)
})

test('CNH nova e antiga: nome e CPF', () => {
  assert.deepEqual(lerTextoDoDocumento(CNH_NOVA).parsed, {
    documentType: 'cnh',
    personal: { nome: 'MARIA DAS GRAÇAS SOUZA', cpf: '11144477735' },
  })
  assert.deepEqual(lerTextoDoDocumento(CNH_ANTIGA).parsed, {
    documentType: 'cnh',
    personal: { nome: 'JOÃO PEDRO DA SILVA', cpf: '52998224725' },
  })
})

test('CNH sem nome, com CPF inválido ou com dois CPFs vai para a IA', () => {
  const semNome = CNH_ANTIGA.replace('JOÃO PEDRO DA SILVA', '')
  assert.equal(lerTextoDoDocumento(semNome).motivo, 'nome não encontrado com certeza')
  assert.equal(lerTextoDoDocumento(CNH_ANTIGA.replace('529.982.247-25', '529.982.247-24')).motivo, 'sem CPF válido')
  assert.equal(lerTextoDoDocumento(`${CNH_ANTIGA}\n111.444.777-35`).motivo, 'mais de um CPF')
})

test('conta: um CEP com cidade e UF na mesma linha', () => {
  assert.deepEqual(lerTextoDoDocumento(CONTA).parsed, {
    documentType: 'comprovante_residencia',
    address: { cep: '59280000', uf: 'RN', cidade: 'MACAIBA' },
  })
  const vizinha = CONTA.replace('CENTRO - MACAÍBA - RN    CEP: 59280-000', 'MACAÍBA/RN\nCEP 59280000')
  assert.equal(lerTextoDoDocumento(vizinha).parsed?.address?.uf, 'RN')
})

test('conta com o endereço da empresa (dois CEPs) ou sem cidade vai para a IA', () => {
  const duas = `${CONTA}\nRUA MERMOZ, 150 - BALDO - NATAL - RN 59025-250`
  assert.equal(lerTextoDoDocumento(duas).motivo, 'mais de um CEP')
  const semCidade = CONTA.replace('CENTRO - MACAÍBA - RN    CEP: 59280-000', 'CEP: 59280-000')
  assert.equal(lerTextoDoDocumento(semCidade).motivo, 'cidade e estado não encontrados junto do CEP')
})

test('texto vazio, tipo desconhecido, dois documentos ou tipo diferente do esperado vão para a IA', () => {
  assert.equal(lerTextoDoDocumento('   \n ').motivo, 'sem texto (PDF escaneado ou vazio)')
  assert.equal(lerTextoDoDocumento('Contrato de prestação de serviços entre as partes abaixo assinadas').parsed, null)
  assert.equal(lerTextoDoDocumento(`${CRLV}\n${CNH_ANTIGA}`).motivo, 'mais de um documento no mesmo PDF')
  assert.equal(lerTextoDoDocumento(CNH_ANTIGA, 'crlv').motivo, 'esperava crlv, parece cnh')
})
