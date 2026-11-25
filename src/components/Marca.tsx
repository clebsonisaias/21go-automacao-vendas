import Image from 'next/image'

/**
 * Logo oficial do 21Go (o mesmo do CRM 21Go), gerado por `scripts/logo-21go.py`.
 * O texto do logo é branco: o logo inteiro só vai em fundo escuro (navy).
 *
 * O site usa a versão com a linha "FRANQUIA AUTORIZADA" embaixo de "Proteção Veicular"
 * (`scripts/logo-franquia.py`, pedido do Clebson, 25/11/2026): o site é da CITmax, franquia
 * autorizada da 21Go. Mesmo tamanho do logo original.
 */

/** Proporção do logo inteiro (símbolo + "21 Go! Proteção Veicular"): 484 × 219. */
const LOGO_LARGURA = 484
const LOGO_ALTURA = 219

export function LogoCompleto({
  altura,
  priority = false,
  className = '',
  franquia = true,
}: {
  altura: number
  priority?: boolean
  className?: string
  /** Com a linha "FRANQUIA AUTORIZADA" (padrão). */
  franquia?: boolean
}) {
  return (
    <Image
      src={franquia ? '/brand/logo-21go-franquia.png' : '/brand/logo-21go.png'}
      alt={franquia ? '21Go Proteção Veicular · Franquia autorizada' : '21Go Proteção Veicular'}
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
