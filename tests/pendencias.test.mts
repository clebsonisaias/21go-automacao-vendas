// O que a equipe precisa fazer: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendenciaDoLead, pendenciasDosLeads } from '../src/lib/pendencias.ts'

const agora = Date.parse('2026-11-25T12:00:00.000Z')
const h = (n: number) => new Date(agora - n * 3600_000).toISOString()
// Cadastros inventados, com só os campos que a regra usa.
const base = (extra: Record<string, unknown>) =>
  ({ id: 'lead_1', ref: 'r1', createdAt: h(72), nome: 'Teste', whatsapp: '', placa: 'ABC1D23', status: 'vistoria_enviada', vehicle: {}, ...extra }) as any

test('cada passo da equipe vira a pendência certa', () => {
  assert.equal(pendenciaDoLead(base({ regiaoConfirmada: { status: 'conferir', em: h(30), pixSeguradoEm: h(30) } }), agora)?.tipo, 'pix_segurado')
  assert.equal(pendenciaDoLead(base({ crmVistoria: { tentativas: 1, vistoriaStatus: 'aguardando_revisao', statusLidoEm: h(26) } }), agora)?.tipo, 'vistoria_para_aprovar')
  assert.equal(pendenciaDoLead(base({ cpf: '1', vistoriaData: { enviadoEm: h(3) } }), agora)?.tipo, 'link_vistoria')
  assert.equal(pendenciaDoLead(base({ appVistoUrl: 'https://x', vistoriaData: { enviadoEm: h(3) } }), agora)?.tipo, 'documentos_sem_leitura')
  assert.equal(pendenciaDoLead(base({ status: 'aprovado', pagamento: { paidAt: h(5) } }), agora)?.tipo, 'cadastrar_sga')
  assert.equal(pendenciaDoLead(base({ status: 'aprovado' }), agora)?.tipo, 'cadastrar_sga')
})

test('o que já foi resolvido ou não é da equipe não entra', () => {
  assert.equal(pendenciaDoLead(base({ status: 'aprovado', sgaCadastradoEm: h(1) }), agora), null)
  assert.equal(pendenciaDoLead(base({ regiaoConfirmada: { status: 'regional', em: h(30), pixSeguradoEm: h(30), porEquipe: true }, cpf: '1', appVistoUrl: 'x' }), agora), null)
  assert.equal(pendenciaDoLead(base({ cpf: '1', vistoriaData: { enviadoEm: h(1) } }), agora), null) // link ainda pode sair
  assert.equal(pendenciaDoLead(base({ crmVistoria: { tentativas: 1, vistoriaStatus: 'em_andamento' }, appVistoUrl: 'x', cpf: '1' }), agora), null)
  assert.equal(pendenciaDoLead(base({ status: 'cancelado', pagamento: { paidAt: h(5) } }), agora), null)
  assert.equal(pendenciaDoLead(base({ id: 'aaaa-bbbb-cccc', status: 'aprovado' }), agora), null) // importado do CRM
  assert.equal(pendenciaDoLead(base({ createdAt: h(24 * 61), status: 'aprovado' }), agora), null) // antigo demais
  assert.equal(pendenciaDoLead(base({ status: 'pendente_vistoria' }), agora), null) // é o cliente que falta mandar
})

test('lista na ordem de urgência e, dentro dela, os mais antigos primeiro', () => {
  const l = pendenciasDosLeads(
    [
      base({ ref: 'sga', status: 'aprovado', pagamento: { paidAt: h(50) } }),
      base({ ref: 'pix-novo', regiaoConfirmada: { status: 'conferir', em: h(2), pixSeguradoEm: h(2) } }),
      base({ ref: 'pix-velho', regiaoConfirmada: { status: 'conferir', em: h(49), pixSeguradoEm: h(49) } }),
      base({ ref: 'nada', status: 'pendente_vistoria' }),
    ],
    agora
  )
  assert.deepEqual(l.map((p) => p.ref), ['pix-velho', 'pix-novo', 'sga'])
  assert.equal(l[0].dias, 2)
  assert.deepEqual(Object.keys(l[0]).sort(), ['desde', 'dias', 'nome', 'placa', 'ref', 'tipo'])
})
