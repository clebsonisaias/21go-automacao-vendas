/**
 * Tabela Nordeste MT Motors 2025: mensalidade da regional Rio Grande do Norte.
 *
 * Quem mora no Rio Grande do Norte ou nos estados colados a ele (Paraíba e Ceará) paga a
 * mensalidade desta tabela (faixa da FIPE + tipo do veículo), no lugar do preço do CRM. O resto
 * do Brasil, inclusive os outros estados do Nordeste, paga o preço do CRM (decisão do Clebson,
 * 23/11/2026). No código, "regional" = estado onde a tabela vale. Valores transcritos
 * do PDF "Tabela Nordeste MT Motors 2025" (coluna "Valor total mensalidade"); o teste
 * `tests/tabela-nordeste.test.mts` confere cada linha.
 *
 * Só funções puras, sem import de outros módulos (roda no teste com node --experimental-strip-types).
 */

export type CategoriaNordeste = 'passeio' | 'utilitario' | 'moto' | 'moto_especial'

export const NOMES_CATEGORIA: Record<CategoriaNordeste, string> = {
  passeio: 'Carro de passeio',
  utilitario: 'Utilitário',
  moto: 'Moto',
  moto_especial: 'Moto acima de 300 cc',
}

export interface FaixaNordeste {
  cota: string
  /** FIPE mínima da faixa (inclusive). */
  de: number
  /** FIPE máxima da faixa (inclusive). */
  ate: number
  mensalidade: number
}

/** [cota, FIPE até, mensalidade]; a FIPE mínima é a máxima da faixa anterior + R$ 0,01. */
type Linha = [string, number, number]

function faixas(linhas: Linha[], primeiroDe = 0): FaixaNordeste[] {
  let de = primeiroDe
  return linhas.map(([cota, ate, mensalidade]) => {
    const f = { cota, de, ate, mensalidade }
    de = Math.round((ate + 0.01) * 100) / 100
    return f
  })
}

export const TABELAS_NORDESTE: Record<CategoriaNordeste, FaixaNordeste[]> = {
  passeio: faixas([
    ['0,5', 10_400, 89.4],
    ['1,0', 20_800, 95.4],
    ['1,5', 31_200, 118.4],
    ['2,0', 36_400, 131.4],
    ['2,5', 41_600, 140.4],
    ['3,0', 46_800, 160.5],
    ['3,5', 52_000, 176.5],
    ['4,0', 57_200, 186.5],
    ['4,5', 62_400, 195.5],
    ['5', 67_600, 205.5],
    ['5,5', 72_800, 216.5],
    ['6', 78_000, 235.5],
    ['6,5', 83_200, 257.5],
    ['7', 88_400, 276.5],
    ['7,5', 93_600, 290.5],
    ['8', 104_000, 316.5],
    ['8,5', 114_400, 351.4],
    ['9', 124_800, 375.4],
    ['9,5', 135_200, 391.4],
    ['10', 145_600, 405.4],
    ['10,5', 156_000, 415.4],
  ]),
  utilitario: faixas([
    ['0,5', 10_400, 117.4],
    ['1,0', 20_800, 123.4],
    ['1,5', 31_200, 145.4],
    ['2,0', 41_600, 167.4],
    ['2,5', 52_000, 203.5],
    ['3,0', 62_400, 224.5],
    ['3,5', 72_800, 270.5],
    ['4,0', 83_200, 290.5],
    ['4,5', 93_600, 310.5],
    ['5', 104_000, 342.5],
    ['5,5', 114_400, 389.4],
    ['6', 124_800, 409.4],
    ['6,5', 135_200, 443.31],
    ['7', 145_600, 474.22],
    ['7,5', 156_000, 506.45],
    ['8', 166_400, 525.4],
    ['8,5', 176_800, 559.4],
    ['9', 187_200, 585.4],
    ['9,5', 197_600, 610.4],
    ['10', 208_000, 635.5],
    ['10,5', 218_400, 651.4],
    ['11', 228_800, 671.4],
    ['11,5', 239_200, 696.4],
    ['12', 249_600, 718.4],
    ['12,5', 260_000, 751.4],
  ]),
  moto: faixas([
    ['0,5', 3_500, 36.9],
    ['1,0', 5_000, 41.9],
    ['1,5', 10_000, 62.9],
    ['2,0', 15_000, 71.9],
    ['2,5', 20_000, 81.9],
    ['3,0', 25_000, 96.4],
    ['3,5', 30_000, 107.4],
  ]),
  moto_especial: faixas(
    [
      ['4,0', 25_000, 153.9],
      ['4,5', 30_000, 167.9],
      ['5', 35_000, 187.9],
      ['5,5', 40_000, 218],
      ['6', 45_000, 236],
      ['6,5', 50_000, 254],
    ],
    20_000.01
  ),
}

export const FONTE_TABELA = 'Tabela Nordeste MT Motors 2025'

/** Picapes médias e grandes e SUVs: usam a tabela de utilitário. O /admin acrescenta ou tira. */
export const UTILITARIOS_PADRAO: string[] = [
  // Picapes médias e grandes
  'Hilux',
  'SW4',
  'S10',
  'Trailblazer',
  'Ranger',
  'Amarok',
  'Frontier',
  'L200',
  'Triton',
  'Toro',
  'Ram',
  'Rampage',
  'Maverick',
  'Titano',
  // SUVs
  'Compass',
  'Commander',
  'Renegade',
  'Pajero',
  'Outlander',
  'ASX',
  'Eclipse Cross',
  'Creta',
  'Tucson',
  'Santa Fe',
  'Kicks',
  'HR-V',
  'CR-V',
  'WR-V',
  'ZR-V',
  'T-Cross',
  'Taos',
  'Tiguan',
  'Nivus',
  'Tracker',
  'Equinox',
  'Duster',
  'Captur',
  'EcoSport',
  'Territory',
  'Bronco',
  'Corolla Cross',
  'RAV4',
  'Yaris Cross',
  'Sportage',
  'Sorento',
  'Tiggo',
  'Pulse',
  'Fastback',
  '2008',
  '3008',
  'C4 Cactus',
  'Aircross',
  'ix35',
  'Grand Cherokee',
  'Wrangler',
  'X-Trail',
  'Koleos',
  'Vitara',
  'Forester',
  'XC60',
  'XC40',
  'Q3',
  'Q5',
  'X1',
  'X3',
  'GLA',
  'Evoque',
  '5008',
  'Haval',
  'Song',
  'Jimny',
  'Discovery',
]

/** Maiúsculas, sem acento, espaços simples: para comparar nomes de modelo. */
export function normalizarModelo(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O modelo casa com um item da lista como palavra inteira ("RAM" não casa com "RAMPAGE"). */
export function ehUtilitario(modelo: string, lista: string[] = UTILITARIOS_PADRAO): string | null {
  // Sem hífen dos dois lados: "HRV" casa com "HR-V", "X-Trail" com "XTRAIL".
  const semHifen = (v: unknown) => normalizarModelo(v).replace(/-/g, '')
  const m = semHifen(modelo)
  if (!m) return null
  for (const item of lista) {
    const n = semHifen(item)
    if (n && new RegExp(`(^|[^A-Z0-9])${escapar(n)}([^A-Z0-9]|$)`).test(m)) return item
  }
  return null
}

/** Cilindrada lida no nome da moto ("CB 500F", "MT-07 689cc", "S 1000 RR", "CBR 1.000RR"), ou null. */
export function cilindrada(modelo: string): number | null {
  // "1.000" é mil, não 1 seguido de 000.
  const m = normalizarModelo(modelo).replace(/\b(\d)\.(\d{3})(?!\d)/g, '$1$2')
  const cc = m.match(/(\d{2,4})\s*CC\b/)
  if (cc) return Number(cc[1])
  for (const x of m.matchAll(/(?:^|[^\d.,])(\d{3,4})(?![\d.,])/g)) {
    const n = Number(x[1])
    if (n >= 50 && n <= 2500) return n
  }
  return null
}

export interface VeiculoParaTabela {
  tipo: 'carro' | 'moto'
  modelo: string
  fipe: number
  /** Marca, quando se sabe: Harley-Davidson é sempre acima de 300 cc (o número no nome é polegada cúbica). */
  marca?: string
}

/**
 * Moto acima de 300 cc usa a tabela de moto especial (que começa em FIPE de R$ 20 mil). Sem a
 * cilindrada no nome ("MT-03", "XJ6 N"), moto de FIPE acima de R$ 20 mil vai para a especial:
 * na dúvida, a faixa mais alta (o comprovante e a vistoria não conferem cilindrada).
 */
export function categoriaNordeste(v: VeiculoParaTabela, utilitarios: string[] = UTILITARIOS_PADRAO): CategoriaNordeste {
  if (v.tipo === 'moto') {
    if (/HARLEY/.test(normalizarModelo(v.marca))) return 'moto_especial'
    const cc = cilindrada(v.modelo)
    if (cc !== null) return cc > 300 ? 'moto_especial' : 'moto'
    return v.fipe > 20_000 ? 'moto_especial' : 'moto'
  }
  return ehUtilitario(v.modelo, utilitarios) ? 'utilitario' : 'passeio'
}

export interface PrecoNordeste {
  categoria: CategoriaNordeste
  cota: string
  faixaDe: number
  faixaAte: number
  mensalidade: number
}

/** Faixa da tabela para o veículo, ou null quando a FIPE fica fora das faixas (vale o preço do CRM). */
export function precoNordeste(v: VeiculoParaTabela, utilitarios: string[] = UTILITARIOS_PADRAO): PrecoNordeste | null {
  const fipe = Number(v.fipe)
  if (!Number.isFinite(fipe) || fipe <= 0) return null
  const categoria = categoriaNordeste(v, utilitarios)
  const f = TABELAS_NORDESTE[categoria].find((x) => fipe >= x.de && fipe <= x.ate)
  if (!f) return null
  return { categoria, cota: f.cota, faixaDe: f.de, faixaAte: f.ate, mensalidade: f.mensalidade }
}

// ---------- Estados, DDD e CEP ----------

/** Estados onde a tabela vale: o Rio Grande do Norte e os colados a ele. */
export const UFS_DA_TABELA = ['RN', 'PB', 'CE'] as const
export const ESTADOS_DA_TABELA = 'Rio Grande do Norte, Paraíba e Ceará'

export const UFS: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

/** "rn", "RN", "Rio Grande do Norte" → "RN"; o que não for UF → null. */
export function normalizarUf(v: unknown): string | null {
  const s = normalizarModelo(v)
  if (!s) return null
  if (s.length === 2) return s in UFS ? s : null
  for (const [uf, nome] of Object.entries(UFS)) if (normalizarModelo(nome) === s) return uf
  return null
}

export function naRegiaoDaTabela(uf: unknown): boolean {
  const u = normalizarUf(uf)
  return !!u && (UFS_DA_TABELA as readonly string[]).includes(u)
}

const DDD_UF: Record<string, string> = {}
const ddds: [string, number[]][] = [
  ['SP', [11, 12, 13, 14, 15, 16, 17, 18, 19]],
  ['RJ', [21, 22, 24]],
  ['ES', [27, 28]],
  ['MG', [31, 32, 33, 34, 35, 37, 38]],
  ['PR', [41, 42, 43, 44, 45, 46]],
  ['SC', [47, 48, 49]],
  ['RS', [51, 53, 54, 55]],
  ['DF', [61]],
  ['GO', [62, 64]],
  ['TO', [63]],
  ['MT', [65, 66]],
  ['MS', [67]],
  ['AC', [68]],
  ['RO', [69]],
  ['BA', [71, 73, 74, 75, 77]],
  ['SE', [79]],
  ['PE', [81, 87]],
  ['AL', [82]],
  ['PB', [83]],
  ['RN', [84]],
  ['CE', [85, 88]],
  ['PI', [86, 89]],
  ['PA', [91, 93, 94]],
  ['AM', [92, 97]],
  ['RR', [95]],
  ['AP', [96]],
  ['MA', [98, 99]],
]
for (const [uf, lista] of ddds) for (const d of lista) DDD_UF[String(d)] = uf

/** UF pelo DDD do telefone (com ou sem 55), ou null. */
export function ufDoDdd(telefone: unknown): string | null {
  let d = String(telefone ?? '').replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  if (d.length < 10) return null
  return DDD_UF[d.slice(0, 2)] ?? null
}

/** Faixas de CEP dos Correios (5 primeiros dígitos) por UF. */
const CEP_UF: [number, number, string][] = [
  [1000, 19999, 'SP'],
  [20000, 28999, 'RJ'],
  [29000, 29999, 'ES'],
  [30000, 39999, 'MG'],
  [40000, 48999, 'BA'],
  [49000, 49999, 'SE'],
  [50000, 56999, 'PE'],
  [57000, 57999, 'AL'],
  [58000, 58999, 'PB'],
  [59000, 59999, 'RN'],
  [60000, 63999, 'CE'],
  [64000, 64999, 'PI'],
  [65000, 65999, 'MA'],
  [66000, 68899, 'PA'],
  [68900, 68999, 'AP'],
  [69000, 69299, 'AM'],
  [69300, 69399, 'RR'],
  [69400, 69899, 'AM'],
  [69900, 69999, 'AC'],
  [70000, 72799, 'DF'],
  [72800, 72999, 'GO'],
  [73000, 73699, 'DF'],
  [73700, 76799, 'GO'],
  [76800, 76999, 'RO'],
  [77000, 77999, 'TO'],
  [78000, 78899, 'MT'],
  [79000, 79999, 'MS'],
  [80000, 87999, 'PR'],
  [88000, 89999, 'SC'],
  [90000, 99999, 'RS'],
]

export function ufDoCep(cep: unknown): string | null {
  const d = String(cep ?? '').replace(/\D/g, '')
  if (d.length !== 8) return null
  const p = Number(d.slice(0, 5))
  return CEP_UF.find(([a, b]) => p >= a && p <= b)?.[2] ?? null
}

export type RegiaoDoComprovante =
  | { status: 'regional' | 'fora'; uf: string }
  | { status: 'conferir'; motivo: string }

/**
 * Onde o cliente mora, pelo comprovante: a UF lida precisa bater com o CEP lido.
 * Sem um dos dois, ou com os dois diferentes, a equipe confere (o preço não muda sozinho).
 */
export function regiaoDoComprovante(endereco: { uf?: unknown; cep?: unknown } | undefined | null): RegiaoDoComprovante {
  const uf = normalizarUf(endereco?.uf)
  const ufCep = ufDoCep(endereco?.cep)
  if (!uf && !ufCep) return { status: 'conferir', motivo: 'não deu para ler o estado nem o CEP do comprovante' }
  if (!uf) return { status: 'conferir', motivo: `não deu para ler o estado do comprovante (CEP de ${ufCep})` }
  if (!ufCep) return { status: 'conferir', motivo: `não deu para ler o CEP do comprovante (estado ${uf})` }
  if (uf !== ufCep) return { status: 'conferir', motivo: `o estado do comprovante (${uf}) não bate com o CEP (${ufCep})` }
  return { status: naRegiaoDaTabela(uf) ? 'regional' : 'fora', uf }
}

// ---------- Textos ----------

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** "Carro de passeio, cota 8, FIPE até R$ 104.000,00: R$ 316,50/mês" (para CRM, Telegram e painel). */
export function descreverTabela(t: PrecoNordeste): string {
  return `${NOMES_CATEGORIA[t.categoria]}, cota ${t.cota}, FIPE até ${brl(t.faixaAte)}: ${brl(t.mensalidade)}/mês`
}

/** Linha da observação do CRM e do Telegram: tabela, estado e o preço nacional que ela substitui. */
export function linhaTabelaNordeste(t: PrecoNordeste, uf: string | undefined, nacional?: number): string {
  return `${FONTE_TABELA}${uf ? ` (${uf})` : ''}: ${descreverTabela(t)}${nacional ? ` (preço nacional ${brl(nacional)})` : ''}`
}

// ---------- Estado pela localização ----------

/** O ponto (longitude, latitude) está dentro do polígono? (raio que cruza as arestas) */
function dentro(lng: number, lat: number, anel: [number, number][]): boolean {
  let d = false
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i]
    const [xj, yj] = anel[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) d = !d
  }
  return d
}

/**
 * Estado onde a tabela vale (RN, PB ou CE) em que está a localização, ou null (fora deles, ou
 * coordenada inválida). Recebe os contornos para esta função continuar pura e testável.
 */
export function estadoPelaPosicao(
  lat: number,
  lng: number,
  contornos: Record<string, [number, number][][]>
): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  for (const [uf, aneis] of Object.entries(contornos)) {
    if (aneis.some((a) => dentro(lng, lat, a))) return uf
  }
  return null
}
