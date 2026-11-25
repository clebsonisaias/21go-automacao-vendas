import type { StoredLead } from './db'

/**
 * "O que a equipe precisa fazer" (aba Carteira, pedido do Clebson, 25/11/2026): os cadastros do
 * site parados num passo que é da equipe. Funciona sem o Telegram, que hoje não está configurado.
 *
 * Função pura (só tipo importado), testada com `node --test`. Nenhum dado além de nome e placa
 * sai daqui para a tela.
 */

export type TipoPendencia = 'pix_segurado' | 'vistoria_para_aprovar' | 'link_vistoria' | 'documentos_sem_leitura' | 'cadastrar_sga'

export interface Pendencia {
  tipo: TipoPendencia
  ref: string
  nome: string
  placa: string
  desde: string
  dias: number
}

/** O que fazer em cada tipo, na ordem em que aparecem (o mais urgente primeiro). */
export const PENDENCIAS: { tipo: TipoPendencia; titulo: string; acao: string }[] = [
  {
    tipo: 'pix_segurado',
    titulo: 'Pix segurado: falta decidir o preço',
    acao: 'A vistoria foi aprovada, mas o comprovante não confirmou o estado. Abra o cadastro e decida entre a tabela regional e o preço nacional; o Pix sai na hora.',
  },
  {
    tipo: 'vistoria_para_aprovar',
    titulo: 'Vistoria esperando aprovação',
    acao: 'O cliente terminou as fotos. Aprove a vistoria no CRM 21Go; o Pix da adesão sai sozinho.',
  },
  {
    tipo: 'link_vistoria',
    titulo: 'Link da vistoria não foi gerado',
    acao: 'O site não conseguiu gerar o link no CRM. Gere no CRM 21Go e cole no cadastro.',
  },
  {
    tipo: 'documentos_sem_leitura',
    titulo: 'Documentos sem leitura do CPF',
    acao: 'Os documentos chegaram, mas o CPF não foi lido. Confira os arquivos no cadastro.',
  },
  {
    tipo: 'cadastrar_sga',
    titulo: 'Adesão paga: cadastrar no Hinova SGA',
    acao: 'Cadastre o associado no Hinova SGA para gerar as mensalidades e marque como feito.',
  },
]

const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
/** Cadastros mais antigos que isso não entram (o que já foi resolvido por fora não fica para sempre). */
const IDADE_MAXIMA = 60 * DIA
/** O link da vistoria costuma sair em minutos; depois de 2 horas sem ele, é com a equipe. */
const ESPERA_LINK = 2 * HORA

/** Cadastro feito no site ou no chat (os importados do CRM têm outro formato de id). */
export function doSite(l: Pick<StoredLead, 'id'>): boolean {
  return l.id.startsWith('lead_') || !l.id.includes('-')
}

function tempo(iso: string | undefined, fallback: string): string {
  return iso && Number.isFinite(Date.parse(iso)) ? iso : fallback
}

/** O passo da equipe em que o cadastro está parado, ou null. */
export function pendenciaDoLead(l: StoredLead, agoraMs: number): { tipo: TipoPendencia; desde: string } | null {
  if (!doSite(l) || l.status === 'cancelado') return null
  if (agoraMs - Date.parse(l.createdAt) > IDADE_MAXIMA) return null

  const pago = Boolean(l.pagamento?.paidAt)
  if ((pago || l.status === 'aprovado') && !l.sgaCadastradoEm) {
    return { tipo: 'cadastrar_sga', desde: tempo(l.pagamento?.paidAt, l.createdAt) }
  }
  if (l.status !== 'vistoria_enviada') return null

  const rc = l.regiaoConfirmada
  if (rc?.pixSeguradoEm && !rc.porEquipe) return { tipo: 'pix_segurado', desde: rc.pixSeguradoEm }
  if (l.crmVistoria?.vistoriaStatus === 'aguardando_revisao') {
    return { tipo: 'vistoria_para_aprovar', desde: tempo(l.crmVistoria.statusLidoEm, l.createdAt) }
  }
  const enviados = l.vistoriaData?.enviadoEm
  if (enviados && !l.appVistoUrl && agoraMs - Date.parse(enviados) > ESPERA_LINK) {
    return { tipo: 'link_vistoria', desde: enviados }
  }
  if (enviados && !l.cpf) return { tipo: 'documentos_sem_leitura', desde: enviados }
  return null
}

/** As pendências de todos os cadastros, pela ordem de PENDENCIAS e, dentro dela, as mais antigas primeiro. */
export function pendenciasDosLeads(leads: StoredLead[], agoraMs: number): Pendencia[] {
  const ordem = PENDENCIAS.map((p) => p.tipo)
  return leads
    .map((l) => {
      const p = pendenciaDoLead(l, agoraMs)
      if (!p) return null
      return {
        tipo: p.tipo,
        ref: l.ref,
        nome: l.nome || 'Cliente',
        placa: l.placa || l.vehicle?.placa || '',
        desde: p.desde,
        dias: Math.max(0, Math.floor((agoraMs - Date.parse(p.desde)) / DIA)),
      }
    })
    .filter((p): p is Pendencia => p !== null)
    .sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo) || Date.parse(a.desde) - Date.parse(b.desde))
}
