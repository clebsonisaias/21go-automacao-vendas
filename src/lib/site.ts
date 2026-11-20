// Dados públicos da franquia (configuráveis via variáveis NEXT_PUBLIC_*).
const digits = (v?: string) => (v || '').replace(/\D/g, '')

export const SITE = {
  whatsapp: digits(process.env.NEXT_PUBLIC_FRANQUIA_WHATSAPP),
  nome: process.env.NEXT_PUBLIC_FRANQUIA_NOME || '',
  email: process.env.NEXT_PUBLIC_FRANQUIA_EMAIL || '',
  horario: process.env.NEXT_PUBLIC_FRANQUIA_HORARIO || '',
  cnpj: process.env.NEXT_PUBLIC_FRANQUIA_CNPJ || '',
}

/** Link do WhatsApp da franquia; sem número configurado, leva para o formulário de cotação. */
export function whatsappUrl(message?: string): string {
  if (!SITE.whatsapp) return '#cotacao'
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${SITE.whatsapp}${text}`
}

export const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export const money = (n: number) => n.toFixed(2).replace('.', ',')
