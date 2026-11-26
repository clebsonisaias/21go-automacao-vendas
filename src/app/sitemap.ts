import type { MetadataRoute } from 'next'
import { cidadesPublicadas } from '@/lib/cidades'

const URL_SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br').replace(/\/+$/, '')

/** Páginas públicas que o Google deve achar. A data das cidades é a da última revisão do texto. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_SITE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${URL_SITE}/protecao-veicular`, lastModified: '2026-11-25', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${URL_SITE}/protecao-veicular/moto`, lastModified: '2026-11-25', changeFrequency: 'monthly', priority: 0.7 },
    ...cidadesPublicadas().map((c) => ({
      url: `${URL_SITE}/protecao-veicular/${c.slug}`,
      lastModified: c.revisadoEm,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${URL_SITE}/privacidade`, lastModified: '2026-11-25', changeFrequency: 'yearly', priority: 0.2 },
  ]
}
