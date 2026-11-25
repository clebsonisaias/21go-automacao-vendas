import type { MetadataRoute } from 'next'

const URL_SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br').replace(/\/+$/, '')

/** Páginas públicas que o Google deve achar (as páginas por cidade entram na etapa 2b). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_SITE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${URL_SITE}/privacidade`, lastModified: '2026-11-25', changeFrequency: 'yearly', priority: 0.2 },
  ]
}
