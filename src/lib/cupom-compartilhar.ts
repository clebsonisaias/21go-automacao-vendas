/**
 * Texto pronto para divulgar um cupom (botão "Compartilhar" da aba Cupons, pedido do Clebson,
 * 25/11/2026, para o NET21GO dos colaboradores da Netgo). O link leva à home com `?cupom=`, que
 * já preenche o código no cadastro.
 *
 * Funções puras, sem imports (testadas com `node --test`).
 */

export interface CupomParaCompartilhar {
  codigo: string
  tipo: 'valor' | 'percentual'
  desconto: number
  fim?: string
  maxUsos: number | null
  usos: number
}

const CODIGO = /^[A-Z0-9][A-Z0-9-]{1,28}[A-Z0-9]$/

/** Código vindo de link (`?cupom=`): maiúsculas e só o formato aceito; senão, vazio. */
export function codigoDoLink(v: unknown): string {
  const c = typeof v === 'string' ? v.trim().toUpperCase() : ''
  return CODIGO.test(c) ? c : ''
}

export function linkDoCupom(siteUrl: string, codigo: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/?cupom=${encodeURIComponent(codigo)}#cotacao`
}

function oQueDa(c: CupomParaCompartilhar): string {
  if (c.tipo === 'percentual') return c.desconto >= 100 ? 'adesão grátis' : `${c.desconto}% de desconto na adesão`
  const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.desconto)
  return `${reais} de desconto na adesão`
}

/** "Colaboradores da Netgo" → "colaboradores da Netgo" (só quando a primeira palavra é comum). */
const PALAVRAS_COMUNS = /^(colaboradores|colaboradoras|funcionários|funcionárias|clientes|amigos|amigas|associados|associadas|alunos|alunas|membros|parceiros|parceiras|servidores|servidoras|sócios|familiares|equipe|time|motoristas|professores|todos)\b/i
function publico(paraQuem: string): string {
  const p = paraQuem.replace(/\s+/g, ' ').trim().slice(0, 80)
  return PALAVRAS_COMUNS.test(p) ? p.charAt(0).toLowerCase() + p.slice(1) : p
}

function validade(c: CupomParaCompartilhar): string {
  const partes: string[] = []
  if (c.fim && /^\d{4}-\d{2}-\d{2}$/.test(c.fim)) partes.push(`até ${c.fim.split('-').reverse().join('/')}`)
  if (c.maxUsos === 1) partes.push('para um cadastro')
  else if (c.maxUsos) {
    const resta = Math.max(0, c.maxUsos - c.usos)
    partes.push(`para ${resta} ${resta === 1 ? 'cadastro' : 'cadastros'}`)
  }
  return partes.length ? `Vale ${partes.join(' e ')}.` : ''
}

/** Mensagem para o WhatsApp: o que o cupom dá, para quem, como usar e até quando vale. */
export function textoDoCupom(
  c: CupomParaCompartilhar,
  opcoes: { siteUrl: string; paraQuem?: string; whatsapp?: string }
): string {
  const quem = opcoes.paraQuem ? publico(opcoes.paraQuem) : ''
  const abertura = quem
    ? `Olá! 👋 Condição especial para ${quem}: a proteção veicular da 21Go, com a CITmax, está com *${oQueDa(c)}* usando o cupom *${c.codigo}*.`
    : `Olá! 👋 A proteção veicular da 21Go, com a CITmax, está com *${oQueDa(c)}* usando o cupom *${c.codigo}*.`
  const zap = (opcoes.whatsapp || '').replace(/\D/g, '')
  const regra = validade(c)
  return [
    abertura,
    '',
    'Como usar:',
    `1. Faça a cotação pela placa neste link: ${linkDoCupom(opcoes.siteUrl, c.codigo)}`,
    '2. Escolha o plano e faça o cadastro: o cupom já vem preenchido.',
    ...(zap ? [`3. Se preferir, mande o código ${c.codigo} no nosso WhatsApp: https://wa.me/${zap}`] : []),
    '',
    `O desconto é na taxa de adesão; a mensalidade segue o plano escolhido.${regra ? ` ${regra}` : ''}`,
  ].join('\n')
}
