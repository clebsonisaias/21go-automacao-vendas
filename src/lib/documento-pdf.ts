/**
 * Leitura de documento pelo TEXTO de um PDF digital, sem IA.
 *
 * O CRLV-e baixado do app, a CNH digital e muitas contas em PDF já trazem o texto dentro do
 * arquivo (extraído por `pdf-texto.ts`). Aqui o código procura os campos que o site usa e só
 * responde quando tem certeza: formato e dígito verificador conferidos e um valor só para cada
 * campo. Na dúvida devolve `parsed: null` com o motivo, e o documento segue para a IA como antes.
 *
 * Funções puras, sem imports (os testes rodam com `node --test`). O formato de saída é o mesmo
 * da IA (`SYSTEM_PROMPT` de document-ai.ts), para passar pelo mesmo `postProcess`.
 */

export type TipoDocumento = 'cnh' | 'crlv' | 'comprovante_residencia'

export interface LeituraPorTexto {
  documentType: TipoDocumento
  personal?: { nome: string; cpf: string }
  vehicle?: { placa: string; chassi?: string; renavam?: string }
  address?: { cep: string; uf: string; cidade?: string }
}

export interface ResultadoTexto {
  parsed: LeituraPorTexto | null
  /** Por que não leu (ou o tipo lido). Sem nenhum dado do documento: vai para o log. */
  motivo: string
}

/** Sem acento e em maiúsculas, para comparar rótulos. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

/** CPF pelos dígitos verificadores. */
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  for (const tam of [9, 10]) {
    let soma = 0
    for (let i = 0; i < tam; i++) soma += Number(d[i]) * (tam + 1 - i)
    const dv = ((soma * 10) % 11) % 10
    if (dv !== Number(d[tam])) return false
  }
  return true
}

/** Renavam de 11 dígitos pelo dígito verificador (pesos 2 a 9 e depois 2 e 3, da direita). */
export function renavamValido(renavam: string): boolean {
  const d = renavam.replace(/\D/g, '')
  if (d.length !== 11 || /^0+$/.test(d)) return false
  let soma = 0
  let peso = 2
  for (let i = 9; i >= 0; i--) {
    soma += Number(d[i]) * peso
    peso = peso >= 9 ? 2 : peso + 1
  }
  const dv = 11 - (soma % 11)
  return (dv >= 10 ? 0 : dv) === Number(d[10])
}

const MARCAS_CRLV = /CERTIFICADO DE REGISTRO E LICENCIAMENTO|\bCRLV\b/
const MARCAS_CNH = /CARTEIRA NACIONAL DE HABILITA|CARTEIRA DE IDENTIDADE/
const MARCAS_CONTA =
  /CONTA DE ENERGIA|ENERGIA ELETRICA|\bKWH\b|\bCONSUMO\b|\bFATURA\b|NOTA FISCAL|AGUA E ESGOTO|CONTA DE AGUA|CONTA DE GAS|SANEAMENTO|TELEFONIA/

/** Tipo pelo texto. Dois tipos no mesmo PDF (ou nenhum) não é decidido aqui. */
function tipoDoTexto(t: string): TipoDocumento | 'varios' | null {
  const crlv = MARCAS_CRLV.test(t)
  const cnh = MARCAS_CNH.test(t)
  if (crlv && cnh) return 'varios'
  if (crlv) return 'crlv'
  if (cnh) return 'cnh'
  return MARCAS_CONTA.test(t) ? 'comprovante_residencia' : null
}

function distintos(valores: string[]): string[] {
  return [...new Set(valores)]
}

function placas(t: string): string[] {
  return distintos([...t.matchAll(/\b([A-Z]{3})-?([0-9][A-Z0-9][0-9]{2})\b/g)].map((m) => m[1] + m[2]))
}

function chassis(t: string): string[] {
  return distintos(
    [...t.matchAll(/\b[A-HJ-NPR-Z0-9]{17}\b/g)].map((m) => m[0]).filter((c) => /[A-Z]/.test(c) && /\d/.test(c))
  )
}

function cpfs(t: string): string[] {
  return distintos(
    [...t.matchAll(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g)].map((m) => m[0].replace(/\D/g, '')).filter(cpfValido)
  )
}

/** Renavam: 11 dígitos com o verificador certo e que não seja também um CPF válido. */
function renavams(t: string): string[] {
  return distintos([...t.matchAll(/\b\d{11}\b/g)].map((m) => m[0]).filter((n) => renavamValido(n) && !cpfValido(n)))
}

/** Palavras de rótulo e de cabeçalho: um "nome" com uma delas não é o nome da pessoa. */
const NAO_E_NOME =
  /\b(NOME|SOBRENOME|FILIACAO|DOC|IDENTIDADE|CPF|DATA|NASCIMENTO|VALIDADE|REPUBLICA|FEDERATIVA|BRASIL|MINISTERIO|DEPARTAMENTO|TRANSITO|CARTEIRA|NACIONAL|HABILITACAO|ASSINATURA|PORTADOR|EMISSOR|REGISTRO|CATEGORIA|OBSERVACOES|LOCAL|EMISSAO|PERMISSAO|SECRETARIA|ESTADO|GOVERNO|DETRAN|SENATRAN|DENATRAN)\b/

function pareceNome(trecho: string): boolean {
  const s = trecho.trim()
  if (s.length < 8 || s.length > 70) return false
  if (!/^[A-Za-zÀ-ÿ' ]+$/.test(s)) return false
  if (s.split(/\s+/).length < 2) return false
  return !NAO_E_NOME.test(normalizar(s))
}

/** Nome: primeira coluna da linha do rótulo "NOME" (sem filiação ou nome social) ou da seguinte. */
function nomeDaPessoa(linhas: string[]): string | null {
  const achados: string[] = []
  linhas.forEach((linha, i) => {
    const n = normalizar(linha)
    if (!/\bNOME\b/.test(n) || /FILIA|\bMAE\b|\bPAI\b|SOCIAL/.test(n)) return
    const colunas = (l: string) =>
      l
        .split(/\s{2,}/)
        .map((c) => c.trim())
        .filter((c) => c !== '')
    // Na linha do rótulo, o nome pode estar em outra coluna; nas seguintes, só a primeira coluna.
    const naLinha = colunas(linha).find(pareceNome)
    const abaixo = [linhas[i + 1] ?? '', linhas[i + 2] ?? '']
      .map((l) => colunas(l)[0])
      .find((c) => c !== undefined)
    const nome = naLinha ?? (abaixo && pareceNome(abaixo) ? abaixo : undefined)
    if (nome) achados.push(nome.replace(/\s+/g, ' ').toUpperCase())
  })
  const nomes = distintos(achados)
  return nomes.length === 1 ? nomes[0] : null
}

/** CEP com hífen ("59280-000", "59.280-000") ou depois da palavra CEP ("CEP: 59280000"). */
function ceps(t: string): string[] {
  const comHifen = [...t.matchAll(/\b(\d{2})\.?(\d{3})-(\d{3})\b/g)].map((m) => m[1] + m[2] + m[3])
  const rotulados = [...t.matchAll(/\bCEP\b[:.\s]*(\d{5})-?(\d{3})\b/g)].map((m) => m[1] + m[2])
  return distintos([...comHifen, ...rotulados])
}

/** "MACAIBA - RN" ou "MACAIBA/RN" na linha do CEP ou numa vizinha. */
function cidadeUfPerto(linhasNorm: string[], cep: string): { cidade?: string; uf: string } | null {
  const alvo = new RegExp(`${cep.slice(0, 2)}\\.?${cep.slice(2, 5)}-?${cep.slice(5)}`)
  const i = linhasNorm.findIndex((l) => alvo.test(l))
  if (i < 0) return null
  const achados = new Map<string, string | undefined>()
  for (const linha of [linhasNorm[i], linhasNorm[i - 1] ?? '', linhasNorm[i + 1] ?? '']) {
    for (const m of linha.matchAll(/([A-Z][A-Z .'-]{1,40}?)\s*[-/]\s*([A-Z]{2})\b/g)) {
      // "CENTRO - MACAIBA - RN": a cidade é o último pedaço antes da UF.
      const cidade = (m[1].split(/\s-\s|,/).pop() ?? '').trim().replace(/\s+/g, ' ')
      if (!achados.has(m[2])) achados.set(m[2], cidade.split(' ').length <= 4 ? cidade : undefined)
    }
    if (achados.size) break
  }
  if (achados.size !== 1) return null
  const [[uf, cidade]] = [...achados.entries()]
  return { uf, ...(cidade ? { cidade } : {}) }
}

export function lerTextoDoDocumento(texto: string, hint?: string): ResultadoTexto {
  const t = normalizar(texto || '')
  if (t.replace(/\s/g, '').length < 40) return { parsed: null, motivo: 'sem texto (PDF escaneado ou vazio)' }

  const tipo = tipoDoTexto(t)
  if (tipo === 'varios') return { parsed: null, motivo: 'mais de um documento no mesmo PDF' }
  if (!tipo) return { parsed: null, motivo: 'tipo de documento não reconhecido' }
  if (hint && hint !== tipo) return { parsed: null, motivo: `esperava ${hint}, parece ${tipo}` }

  if (tipo === 'crlv') {
    const p = placas(t)
    if (p.length !== 1) return { parsed: null, motivo: p.length ? 'mais de uma placa' : 'sem placa' }
    const c = chassis(t)
    const r = renavams(t)
    return {
      parsed: {
        documentType: 'crlv',
        vehicle: { placa: p[0], ...(c.length === 1 ? { chassi: c[0] } : {}), ...(r.length === 1 ? { renavam: r[0] } : {}) },
      },
      motivo: 'crlv',
    }
  }

  if (tipo === 'cnh') {
    const c = cpfs(t)
    if (c.length !== 1) return { parsed: null, motivo: c.length ? 'mais de um CPF' : 'sem CPF válido' }
    const nome = nomeDaPessoa(texto.split(/\r?\n/))
    if (!nome) return { parsed: null, motivo: 'nome não encontrado com certeza' }
    return { parsed: { documentType: 'cnh', personal: { nome, cpf: c[0] } }, motivo: 'cnh' }
  }

  const lista = ceps(t)
  if (lista.length !== 1) return { parsed: null, motivo: lista.length ? 'mais de um CEP' : 'sem CEP' }
  const lugar = cidadeUfPerto(t.split(/\r?\n/), lista[0])
  if (!lugar) return { parsed: null, motivo: 'cidade e estado não encontrados junto do CEP' }
  return {
    parsed: { documentType: 'comprovante_residencia', address: { cep: lista[0], ...lugar } },
    motivo: 'comprovante_residencia',
  }
}
