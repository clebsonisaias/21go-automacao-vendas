import type { OrigemLead } from './origem'

/**
 * "Receber esta cotação no WhatsApp" (pedido do Clebson, 25/11/2026): quem vê o preço na home e
 * ainda não quer se cadastrar deixa só o WhatsApp. A cotação vai na hora (a pessoa pediu), com o
 * link que reabre a mesma cotação no site, e depois até 2 lembretes automáticos (24 h e 72 h),
 * nas mesmas regras dos lembretes de etapa parada (`lembretes.ts`).
 *
 * Guardado à parte (`DATA_DIR/cotacoes-whatsapp.json`, ver `cotacao-whatsapp-envio.ts`): não é
 * cadastro, não vai ao PowerCRM nem ao CRM, e não aparece como lead no painel.
 *
 * Só funções puras (só import de tipo): roda no teste com `node --test`.
 */

export const VERSAO_CONSENTIMENTO = 'cotacao-whatsapp-v1'
export const TEMPLATE_COTACAO = 'citmax_21go_cotacao'

const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
/** 1º lembrete com 24 h; 2º com 72 h e pelo menos 48 h depois do 1º. */
export const PRIMEIRO_LEMBRETE = 24 * HORA
export const SEGUNDO_LEMBRETE = 72 * HORA
export const ENTRE_LEMBRETES = 48 * HORA
/** O 1º lembrete não sai depois de 7 dias (o servidor ficou parado, por exemplo). */
export const PRIMEIRO_ATE = 7 * DIA
/** Depois de 30 dias não sai mais nada; o link vale 30 dias. */
export const IDADE_MAXIMA = 30 * DIA
export const VALIDADE_LINK = 30 * DIA
/** O registro (com o WhatsApp) é apagado com 90 dias. */
export const GUARDAR_POR = 90 * DIA
/** Mensagem da equipe: no máximo uma a cada 24 h por cotação. */
export const ENTRE_MENSAGENS_EQUIPE = 24 * HORA

export interface PedidoCotacao {
  tipo: 'carro' | 'moto'
  brandId: string
  brandText: string
  modelId: string
  modelText: string
  year: string
  codFipe: string
}

export interface EnvioCotacao {
  em: string
  tipo: 'cotacao' | 'lembrete' | 'equipe'
  ok: boolean
  /** Foi pelo template de reserva (o `citmax_21go_cotacao` ainda não existe na Meta). */
  viaReserva?: boolean
  /** O gateway disse que a conversa estava aberta (a pessoa escreveu nas últimas 24 h). */
  janela?: boolean
}

export interface CotacaoWhatsApp {
  id: string
  /** Credencial do link de retomada (32 caracteres). Nunca aparece no painel. */
  token: string
  criadaEm: string
  expiraEm: string
  /** Só dígitos, com DDD, sem o 55. Nunca vai para log nem Telegram. */
  whatsapp: string
  placa?: string
  uf?: string
  pedido: PedidoCotacao
  veiculo: { marca: string; modelo: string; ano: string; fipeValue: number }
  /** `emDia`: a mensalidade é a de quem paga em dia (com o desconto de pontualidade). */
  plano: {
    id: string
    nome: string
    mensalidade: number
    ativacao: number
    regional: boolean
    emDia?: boolean
    /** Adesão na promoção do dia (Black 21Go), quando a cotação foi pedida durante ela. */
    promoAdesao?: number
    /** Fim da promoção (ISO) e o dia, como vai no texto (27/11): depois do fim, a mensagem volta à adesão cheia. */
    promoAte?: string
    promoDia?: string
  }
  cupom?: string
  origem?: OrigemLead
  consentimento: { versao: string; em: string }
  envios: EnvioCotacao[]
  /** Hora de cada lembrete automático, marcada antes do envio (no máximo 2). */
  lembretes: string[]
  abertaEm?: string
  fechadaEm?: string
  leadRef?: string
  respondeuEm?: string
  paradaEm?: string
  paradaPor?: 'equipe' | 'cliente'
}

/** Celular brasileiro com DDD (com ou sem 55): devolve os 11 dígitos, ou null. */
export function normalizarCelular(bruto: unknown, ufDoDdd: (t: string) => string | null): string | null {
  let d = String(bruto ?? '').replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2)
  if (d.length !== 11) return null
  if (d[2] !== '9') return null
  if (!ufDoDdd(d)) return null
  return d
}

const texto = (v: unknown, max: number) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '')

/** O que o navegador manda para recalcular a cotação; devolve o texto do erro quando falta algo. */
export function validarPedido(b: unknown): PedidoCotacao | string {
  if (!b || typeof b !== 'object') return 'Dados do veículo incompletos.'
  const o = b as Record<string, unknown>
  const tipo = o.tipo === 'moto' ? 'moto' : o.tipo === 'carro' || o.tipo === undefined ? 'carro' : null
  if (!tipo) return 'Tipo de veículo inválido.'
  const p: PedidoCotacao = {
    tipo,
    brandId: texto(o.brandId, 40),
    brandText: texto(o.brandText, 80),
    modelId: texto(o.modelId, 40),
    modelText: texto(o.modelText, 120),
    year: texto(o.year, 40),
    codFipe: texto(o.codFipe, 20),
  }
  if (!p.brandId || !p.modelId || !p.year || !p.codFipe) return 'Dados do veículo incompletos.'
  return p
}

export function tokenValido(t: unknown): t is string {
  return typeof t === 'string' && /^[A-Za-z0-9_-]{32}$/.test(t)
}

/** Link que reabre a cotação na home. A placa nunca vai na URL. */
export function linkDeRetomada(base: string, token: string): string {
  return `${base.replace(/\/+$/, '')}/?cotacao=${token}#cotacao`
}

/** Placa só com letras e números, maiúsculas; vazio se não tiver 7 caracteres. */
export function normalizarPlaca(p: unknown): string {
  const s = String(p ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return s.length === 7 ? s : ''
}

/** Valor como vai na mensagem: 176,50 (1.234,56 com milhar). */
export function reais(v: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function nomeDoVeiculo(c: Pick<CotacaoWhatsApp, 'veiculo'>): string {
  return [c.veiculo.marca, c.veiculo.modelo, c.veiculo.ano].map((s) => String(s || '').trim()).filter(Boolean).join(' ').slice(0, 80)
}

/** Variáveis do template `citmax_21go_cotacao`: veículo, plano, mensalidade, adesão e link. */
export function paramsDoTemplate(c: Pick<CotacaoWhatsApp, 'veiculo' | 'plano'>, url: string, agora = new Date()): string[] {
  return [nomeDoVeiculo(c), c.plano.nome, reais(c.plano.mensalidade), adesaoDoTexto(c.plano, agora), url]
}

/**
 * Adesão como vai na mensagem. Na promoção do dia, com o prazo (o cadastro precisa ser feito nela);
 * mensagem que sai depois do fim (lembrete, reenvio) volta à adesão cheia.
 */
function adesaoDoTexto(plano: CotacaoWhatsApp['plano'], agora: Date): string {
  const fim = plano.promoAte ? Date.parse(plano.promoAte) : NaN
  if (plano.promoAdesao == null || !(agora.getTime() <= fim)) return reais(plano.ativacao)
  const dia = plano.promoDia ? ` de hoje, ${plano.promoDia}` : ' de hoje'
  return `${reais(plano.promoAdesao)} na Black 21Go, para cadastro feito até 23h59${dia} (sem a promoção, R$ ${reais(plano.ativacao)})`
}

export type EtapaMensagem = 'cotacao' | 'lembrete1' | 'lembrete2'

/** Texto livre (dentro da janela de 24 h, ou dentro do template de reserva). */
export function textoDaMensagem(
  c: Pick<CotacaoWhatsApp, 'veiculo' | 'plano' | 'pedido'>,
  url: string,
  etapa: EtapaMensagem,
  agora = new Date()
): string {
  const veiculo = nomeDoVeiculo(c)
  const preco = `R$ ${reais(c.plano.mensalidade)} por mês${c.plano.emDia === false ? '' : ' pagando em dia'}`
  const promo =
    c.plano.regional && c.pedido.tipo === 'carro'
      ? `O plano ${c.plano.nome} está em promoção na tabela regional para quem mora no RN, na Paraíba e no Ceará.`
      : ''
  if (etapa === 'lembrete1') {
    return [
      `Olá! A sua cotação da proteção veicular 21Go para o ${veiculo} continua aqui: plano ${c.plano.nome}, ${preco}.`,
      '',
      `Para continuar de onde parou: ${url}`,
      '',
      'Se tiver dúvida, é só responder esta mensagem.',
    ].join('\n')
  }
  if (etapa === 'lembrete2') {
    return [
      `Olá! Último lembrete da sua cotação da proteção veicular 21Go para o ${veiculo}: plano ${c.plano.nome}, ${preco}.`,
      '',
      `O link continua valendo por alguns dias: ${url}`,
      '',
      'Este é o último lembrete automático desta cotação.',
    ].join('\n')
  }
  return [
    `Olá! Aqui está a cotação da proteção veicular 21Go que você pediu no site para o ${veiculo}:`,
    '',
    `• Plano ${c.plano.nome}: ${preco}`,
    `• Adesão (Pix único): R$ ${adesaoDoTexto(c.plano, agora)}`,
    ...(promo ? ['', promo] : []),
    '',
    `Para ver todos os planos e continuar: ${url}`,
    '',
    'Os valores podem mudar com a Tabela FIPE do mês. Se tiver dúvida, é só responder esta mensagem.',
    '',
    'CITmax, consultor autorizado da 21Go.',
  ].join('\n')
}

function horaBrasilia(agora: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora))
}

/** Lembrete automático só das 9h às 20h de Brasília (até 19:59). */
export function dentroDoHorario(agora: Date): boolean {
  const h = horaBrasilia(agora)
  return h >= 9 && h < 20
}

/** Qual lembrete automático já venceu (1 ou 2), ou null. */
export function lembreteDevido(
  c: Pick<CotacaoWhatsApp, 'criadaEm' | 'envios' | 'lembretes' | 'fechadaEm' | 'respondeuEm' | 'paradaEm'>,
  agoraMs: number,
  opcoes: { jaCadastrou: boolean }
): 1 | 2 | null {
  if (c.fechadaEm || c.respondeuEm || c.paradaEm || opcoes.jaCadastrou) return null
  // Sem a cotação entregue, lembrete não faz sentido (e a equipe vê "não recebeu").
  if (!c.envios.some((e) => e.tipo === 'cotacao' && e.ok)) return null
  // A pessoa escreveu (o gateway achou a conversa aberta num lembrete): para.
  if (c.envios.some((e) => e.tipo === 'lembrete' && e.janela)) return null
  const criada = Date.parse(c.criadaEm)
  if (!Number.isFinite(criada)) return null
  const idade = agoraMs - criada
  if (idade > IDADE_MAXIMA) return null
  if (c.lembretes.length === 0) return idade >= PRIMEIRO_LEMBRETE && idade <= PRIMEIRO_ATE ? 1 : null
  if (c.lembretes.length === 1) {
    const primeiro = Date.parse(c.lembretes[0])
    if (!Number.isFinite(primeiro)) return null
    return idade >= SEGUNDO_LEMBRETE && agoraMs - primeiro >= ENTRE_LEMBRETES ? 2 : null
  }
  return null
}

export interface LeadParaCasar {
  status: string
  createdAt: string
  placa?: string
  vehicle?: { placa?: string }
  whatsapp?: string
  atendaiTelefone?: string
}

/**
 * O cadastro é desta cotação? Mesma placa, ou mesmo WhatsApp (com ou sem 55 e o 9), feito depois
 * da cotação. Cadastro cancelado não conta. `chave` = `chaveTelefone` do atendai.ts (injetada).
 */
export function casaComLead(
  c: Pick<CotacaoWhatsApp, 'criadaEm' | 'placa' | 'whatsapp'>,
  lead: LeadParaCasar,
  chave: (t: string) => string | null
): boolean {
  if (lead.status === 'cancelado') return false
  // Margem de 1 minuto: o cadastro pode chegar no mesmo instante do pedido da cotação.
  if (Date.parse(lead.createdAt) < Date.parse(c.criadaEm) - 60_000) return false
  const placaC = normalizarPlaca(c.placa)
  const placaL = normalizarPlaca(lead.placa || lead.vehicle?.placa)
  if (placaC && placaL && placaC === placaL) return true
  const k = chave(c.whatsapp)
  return !!k && k === chave(lead.atendaiTelefone || lead.whatsapp || '')
}

/** O mesmo número já pediu a cotação deste veículo nas últimas 24 h? Devolve a cotação. */
export function cotacaoRepetida<T extends Pick<CotacaoWhatsApp, 'whatsapp' | 'pedido' | 'criadaEm' | 'paradaEm'>>(
  lista: T[],
  whatsapp: string,
  codFipe: string,
  agoraMs: number,
  chave: (t: string) => string | null
): T | null {
  const k = chave(whatsapp)
  if (!k) return null
  return (
    lista.find(
      (c) =>
        !c.paradaEm &&
        c.pedido.codFipe === codFipe &&
        chave(c.whatsapp) === k &&
        agoraMs - Date.parse(c.criadaEm) < DIA
    ) ?? null
  )
}

/** Este número já pediu 3 cotações nos últimos 7 dias? */
export function excedeuNumero(
  lista: Pick<CotacaoWhatsApp, 'whatsapp' | 'criadaEm'>[],
  whatsapp: string,
  agoraMs: number,
  chave: (t: string) => string | null
): boolean {
  const k = chave(whatsapp)
  if (!k) return true
  return lista.filter((c) => chave(c.whatsapp) === k && agoraMs - Date.parse(c.criadaEm) < 7 * DIA).length >= 3
}

/** Sai do arquivo o que passou de 90 dias. */
export function semAsAntigas<T extends Pick<CotacaoWhatsApp, 'criadaEm'>>(lista: T[], agoraMs: number): T[] {
  return lista.filter((c) => agoraMs - Date.parse(c.criadaEm) < GUARDAR_POR)
}

export function telefoneFinal(t: string): string {
  return String(t || '').replace(/\D/g, '').slice(-4)
}

export type SituacaoCotacao = 'aguardando' | 'lembretes_enviados' | 'respondeu' | 'parada' | 'nao_recebeu'

export interface CotacaoParaEquipe {
  id: string
  veiculo: string
  placa: string
  plano: string
  mensalidade: number
  telefoneFinal: string
  dias: number
  lembretes: number
  abriuLink: boolean
  situacao: SituacaoCotacao
  podeMensagem: boolean
  criadaEm: string
}

/** Quadro "Cotou e não fechou": as dos últimos 30 dias que não viraram cadastro, mais novas primeiro. */
export function cotacoesParaEquipe(lista: CotacaoWhatsApp[], agoraMs: number): CotacaoParaEquipe[] {
  return lista
    .filter((c) => !c.fechadaEm && agoraMs - Date.parse(c.criadaEm) <= IDADE_MAXIMA)
    .sort((a, b) => Date.parse(b.criadaEm) - Date.parse(a.criadaEm))
    .map((c) => {
      const entregue = c.envios.some((e) => e.tipo === 'cotacao' && e.ok)
      const situacao: SituacaoCotacao = c.paradaEm
        ? 'parada'
        : c.respondeuEm
          ? 'respondeu'
          : !entregue
            ? 'nao_recebeu'
            : c.lembretes.length
              ? 'lembretes_enviados'
              : 'aguardando'
      const ultimaEquipe = c.envios.filter((e) => e.tipo === 'equipe' && e.ok).map((e) => Date.parse(e.em)).sort((a, b) => b - a)[0]
      return {
        id: c.id,
        veiculo: nomeDoVeiculo(c),
        placa: c.placa || '',
        plano: c.plano.nome,
        mensalidade: c.plano.mensalidade,
        telefoneFinal: telefoneFinal(c.whatsapp),
        dias: Math.max(0, Math.floor((agoraMs - Date.parse(c.criadaEm)) / DIA)),
        lembretes: c.lembretes.length,
        abriuLink: !!c.abertaEm,
        situacao,
        podeMensagem: !ultimaEquipe || agoraMs - ultimaEquipe >= ENTRE_MENSAGENS_EQUIPE,
        criadaEm: c.criadaEm,
      }
    })
}

/** Texto que a equipe pode mandar (a mensagem pronta do botão "Preparar WhatsApp"). */
export function mensagemSugerida(c: Pick<CotacaoWhatsApp, 'veiculo' | 'plano'>): string {
  return [
    `Olá! Aqui é da CITmax, consultor autorizado da 21Go. Vi que você cotou a proteção do ${nomeDoVeiculo(c)} no nosso site (plano ${c.plano.nome}).`,
    'Ficou alguma dúvida que eu possa te ajudar a resolver?',
    '',
    'A sua cotação: [link da cotação]',
  ].join('\n')
}
