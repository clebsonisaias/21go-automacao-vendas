/**
 * Painel da carteira (ideia do Grok, pedido do Clebson, 25/11/2026): os números do CRM 21Go dentro
 * do /admin e as cotações paradas no funil do site, para a equipe chamar o cliente.
 *
 * Aqui só a leitura das respostas do CRM e as contas, sem rede e sem imports (testado com
 * `node --test`). A busca, o cache e os envios ficam em `crm-carteira.ts`.
 *
 * Respostas lidas (conferidas em 25/11/2026, só a estrutura):
 * - `GET /dashboard/stats`: `periodDays`, `kpis.*`, `funil[{name, count, isWon, isLost}]`, `timeline[{date, entradas, fechados, receita}]`;
 * - `GET /dashboard/meu-trabalho`: `simulacoes`, `placas`, `fechadas`, `boletos{aVencer, vencidos, pagos}`, `funil[{coluna, nome, total}]`;
 * - `GET /pipes/{pipe}/cards`: `data[{id, title, status, createdAt, updatedAt, currentPhase{name, position}}]`.
 */

export interface KpisCarteira {
  entradas: number | null
  entradasDelta: number | null
  fechados: number | null
  fechadosDelta: number | null
  receita: number | null
  receitaDelta: number | null
  taxaConversao: number | null
  emAtendimento: number | null
  emNegociacao: number | null
  emVistoria: number | null
  linksVistoria: number | null
  aguardandoAprovacao: number | null
  pendenciasCliente: number | null
  prestesAFechar: number | null
  reprovados: number | null
  associadosTotal: number | null
  associadosAtivos: number | null
  veiculosProtegidos: number | null
}

export interface EtapaFunil {
  nome: string
  total: number
  ganho?: boolean
  perdido?: boolean
}

export interface DiaCarteira {
  data: string
  entradas: number
  fechados: number
  receita: number
}

export interface MeuTrabalho {
  simulacoes: number
  placas: number
  fechadas: number
  boletos: { aVencer: number; vencidos: number; pagos: number }
  colunas: EtapaFunil[]
}

export interface CardResumo {
  id: string
  titulo: string
  fase: string
  faseOrdem: number
  criadoEm: string
  atualizadoEm: string
}

/** Cotação parada no começo do funil (sem andar há mais do que o limite). */
export interface CardParado {
  id: string
  fase: string
  placa: string
  nome: string
  desde: string
  dias: number
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const texto = (v: unknown, max = 120): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Número do CRM, ou null quando o campo não veio (nunca vira zero por engano). */
export function numero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return null
}

const inteiro = (v: unknown): number => {
  const n = numero(v)
  return n === null ? 0 : Math.max(0, Math.round(n))
}

export function lerKpis(bruto: unknown): KpisCarteira {
  const k = obj(obj(bruto).kpis)
  return {
    entradas: numero(k.entradasPeriodo),
    entradasDelta: numero(k.entradasDelta),
    fechados: numero(k.fechadosPeriodo),
    fechadosDelta: numero(k.fechadosDelta),
    receita: numero(k.receitaPeriodo),
    receitaDelta: numero(k.receitaDelta),
    taxaConversao: numero(k.taxaConversao),
    emAtendimento: numero(k.emAtendimento),
    emNegociacao: numero(k.emNegociacao),
    emVistoria: numero(k.emVistoria),
    linksVistoria: numero(k.linksVistoria),
    aguardandoAprovacao: numero(k.aguardandoAprovacao),
    pendenciasCliente: numero(k.pendenciasCliente),
    prestesAFechar: numero(k.prestesAFechar),
    reprovados: numero(k.reprovadosPeriodo),
    associadosTotal: numero(k.associadosTotal),
    associadosAtivos: numero(k.associadosAtivos),
    veiculosProtegidos: numero(k.veiculosProtegidos),
  }
}

/** Período dos números (dias). O CRM devolve 7 e ignora os parâmetros de período. */
export function lerPeriodo(bruto: unknown): number {
  const n = numero(obj(bruto).periodDays)
  return n && n > 0 && n <= 366 ? Math.round(n) : 7
}

/** Etapas do funil da empresa no CRM, na ordem em que vieram. */
export function lerFunilCrm(bruto: unknown): EtapaFunil[] {
  return lista(obj(bruto).funil)
    .map((e) => {
      const o = obj(e)
      return { nome: texto(o.name, 80), total: inteiro(o.count), ganho: o.isWon === true, perdido: o.isLost === true }
    })
    .filter((e) => e.nome)
}

/** Entradas, fechados e receita por dia, do mais antigo ao mais novo. */
export function lerDias(bruto: unknown): DiaCarteira[] {
  return lista(obj(bruto).timeline)
    .map((d) => {
      const o = obj(d)
      return { data: texto(o.date, 10), entradas: inteiro(o.entradas), fechados: inteiro(o.fechados), receita: numero(o.receita) ?? 0 }
    })
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.data))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
}

export function lerMeuTrabalho(bruto: unknown): MeuTrabalho | null {
  const o = obj(bruto)
  if (!Object.keys(o).length) return null
  const b = obj(o.boletos)
  return {
    simulacoes: inteiro(o.simulacoes),
    placas: inteiro(o.placas),
    fechadas: inteiro(o.fechadas),
    boletos: { aVencer: inteiro(b.aVencer), vencidos: inteiro(b.vencidos), pagos: inteiro(b.pagos) },
    colunas: lista(o.funil)
      .map((c) => {
        const x = obj(c)
        return { nome: texto(x.nome, 80), total: inteiro(x.total), ordem: inteiro(x.coluna) }
      })
      .filter((c) => c.nome)
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ nome, total }) => ({ nome, total })),
  }
}

/** Tem algum número diferente de zero? (o "meu trabalho" do usuário do site costuma vir zerado) */
export function temMovimento(m: MeuTrabalho | null): boolean {
  if (!m) return false
  const { simulacoes, placas, fechadas, boletos, colunas } = m
  return [simulacoes, placas, fechadas, boletos.aVencer, boletos.vencidos, boletos.pagos, ...colunas.map((c) => c.total)].some((n) => n > 0)
}

export function lerCards(bruto: unknown): CardResumo[] {
  return lista(obj(bruto).data)
    .map((c) => {
      const o = obj(c)
      const fase = obj(o.currentPhase)
      return {
        id: texto(o.id, 64),
        titulo: texto(o.title, 160),
        fase: texto(fase.name, 80) || 'Sem fase',
        faseOrdem: numero(fase.position) ?? 999,
        criadoEm: texto(o.createdAt, 40),
        atualizadoEm: texto(o.updatedAt, 40) || texto(o.createdAt, 40),
      }
    })
    .filter((c) => /^[A-Za-z0-9-]{8,64}$/.test(c.id))
}

/** Funil do site no CRM: quantos cards em cada fase, na ordem das fases. */
export function funilDosCards(cards: CardResumo[]): EtapaFunil[] {
  const m = new Map<string, { total: number; ordem: number }>()
  for (const c of cards) {
    const v = m.get(c.fase) || { total: 0, ordem: c.faseOrdem }
    v.total++
    v.ordem = Math.min(v.ordem, c.faseOrdem)
    m.set(c.fase, v)
  }
  return [...m.entries()].sort((a, b) => a[1].ordem - b[1].ordem || a[0].localeCompare(b[0], 'pt-BR')).map(([nome, v]) => ({ nome, total: v.total }))
}

/** "ABC1D23 · Maria Souza" → placa e nome. Título fora do padrão vira só o nome. */
export function tituloDoCard(titulo: string): { placa: string; nome: string } {
  const partes = titulo.split('·').map((s) => s.trim()).filter(Boolean)
  if (partes.length >= 2) {
    const placa = partes[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) return { placa, nome: partes.slice(1).join(' ').slice(0, 80) }
  }
  return { placa: '', nome: titulo.slice(0, 80) }
}

/** Fases do começo do funil, em que o cliente recebeu a cotação e ainda não foi para a vistoria. */
export function faseDeProposta(fase: string): boolean {
  const f = fase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return /recebid|negocia|entrad|atendimento/.test(f)
}

const DIA = 24 * 60 * 60 * 1000

/**
 * Cards no começo do funil sem nenhuma mudança há mais de `horas` (o CRM não diz quando o card
 * entrou na fase; `updatedAt` muda a cada movimento ou edição). Os mais antigos primeiro.
 */
export function cardsParados(cards: CardResumo[], agoraMs: number, horas = 48): CardParado[] {
  return cards
    .filter((c) => faseDeProposta(c.fase))
    .map((c) => ({ c, t: Date.parse(c.atualizadoEm) }))
    .filter(({ t }) => Number.isFinite(t) && agoraMs - t > horas * 60 * 60 * 1000)
    .sort((a, b) => a.t - b.t)
    .map(({ c, t }) => {
      const { placa, nome } = tituloDoCard(c.titulo)
      return { id: c.id, fase: c.fase, placa, nome, desde: new Date(t).toISOString(), dias: Math.floor((agoraMs - t) / DIA) }
    })
}

/** Primeiro nome com só a inicial maiúscula ("MARIA SOUZA" → "Maria"), ou vazio. */
export function primeiroNome(nome: string): string {
  const p = nome.trim().split(/\s+/)[0] || ''
  if (!/^[\p{L}'-]{2,}$/u.test(p)) return ''
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
}

/** Texto sugerido para a equipe revisar antes de mandar (nada sai sozinho). */
export function mensagemDeRetomada(p: { nome: string; veiculo?: string; placa?: string; propostaUrl?: string }): string {
  const ola = primeiroNome(p.nome) ? `Olá, ${primeiroNome(p.nome)}!` : 'Olá!'
  const doVeiculo = p.veiculo ? ` para o ${p.veiculo}` : p.placa ? ` do veículo de placa ${p.placa}` : ''
  return [
    `${ola} Aqui é da CITmax, franquia oficial da 21Go.`,
    ``,
    `Você fez a cotação da proteção veicular${doVeiculo} e ela continua valendo.`,
    ...(p.propostaUrl ? [`Para ver a proposta e contratar: ${p.propostaUrl}`] : []),
    ``,
    `Ficou alguma dúvida? É só responder aqui que eu te ajudo.`,
  ].join('\n')
}

/** Link da proposta do PowerCRM, só com um código válido. */
export function linkDaProposta(codigo: unknown): string {
  const c = typeof codigo === 'string' ? codigo.trim() : ''
  return /^[A-Za-z0-9_-]{4,64}$/.test(c) ? `https://checkout.cotacao.me/myplanquot?h=${c}` : ''
}

/** Texto de WhatsApp que a equipe pode mandar: sem vazio, sem exagero de tamanho. */
export function conferirTexto(t: unknown): string {
  if (typeof t !== 'string') return ''
  const limpo = t.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim()
  return limpo.length >= 10 && limpo.length <= 1000 ? limpo : ''
}

/** Final do telefone para a equipe conferir o destino ("•••• 1234"), sem mostrar o número inteiro. */
export function finalDoTelefone(tel: unknown): string {
  const d = typeof tel === 'string' ? tel.replace(/\D/g, '') : ''
  return d.length >= 10 ? `•••• ${d.slice(-4)}` : ''
}

/** Escapa texto do CRM para o HTML do Telegram. */
function escHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Resumo diário das paradas para o Telegram da equipe: primeiro nome, placa e veículo (sem CPF nem
 * telefone), até 10 linhas, com o link da aba Carteira.
 */
export function resumoDasParadas(paradas: (CardParado & { veiculo?: string; enviadoEm?: string })[], linkPainel: string): string {
  const linhas = paradas.slice(0, 10).map((p) => {
    const quem = primeiroNome(p.nome) || 'Cliente'
    const doque = [p.placa, p.veiculo].filter(Boolean).join(' · ')
    return `• ${escHtml(quem)}${doque ? ` (${escHtml(doque)})` : ''}: ${escHtml(p.fase)}, há ${p.dias} dias${p.enviadoEm ? ', já chamado pelo painel' : ''}`
  })
  return [
    `⏳ <b>Cotações paradas no CRM: ${paradas.length}</b>`,
    'No começo do funil e sem andar há mais de 2 dias:',
    ...linhas,
    ...(paradas.length > 10 ? [`…e mais ${paradas.length - 10}.`] : []),
    '',
    `Para chamar o cliente com a proposta: ${linkPainel}`,
  ].join('\n')
}
