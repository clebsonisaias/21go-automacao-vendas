import Image from 'next/image'

/**
 * Logo oficial do 21Go (o mesmo do CRM 21Go), gerado por `scripts/logo-21go.py`.
 * O texto do logo é branco: o logo inteiro só vai em fundo escuro (navy).
 *
 * O site usa a versão com a linha "CONSULTOR AUTORIZADO" embaixo de "Proteção Veicular"
 * (`scripts/logo-consultor.py`, pedido do Clebson, 25/11/2026): o site é da CITmax, consultor
 * autorizado da 21Go. Mesmo tamanho do logo original.
 */

/** Proporção do logo inteiro (símbolo + "21 Go! Proteção Veicular"): 484 × 219. */
const LOGO_LARGURA = 484
const LOGO_ALTURA = 219

export function LogoCompleto({
  altura,
  priority = false,
  className = '',
  consultor = true,
}: {
  altura: number
  priority?: boolean
  className?: string
  /** Com a linha "CONSULTOR AUTORIZADO" (padrão). */
  consultor?: boolean
}) {
  return (
    <Image
      src={consultor ? '/brand/logo-21go-consultor.png' : '/brand/logo-21go.png'}
      alt={consultor ? '21Go Proteção Veicular · Consultor autorizado' : '21Go Proteção Veicular'}
      width={Math.round((altura * LOGO_LARGURA) / LOGO_ALTURA)}
      height={altura}
      className={`object-contain ${className}`}
      priority={priority}
    />
  )
}

/** Só o símbolo (círculo laranja e alfinete): para espaço pequeno e quadrado. */
export function SimboloLogo({
  lado,
  priority = false,
  alt = '21Go',
}: {
  lado: number
  priority?: boolean
  alt?: string
}) {
  return (
    <Image
      src="/brand/simbolo-21go.png"
      alt={alt}
      width={lado}
      height={lado}
      className="object-contain"
      priority={priority}
    />
  )
}
