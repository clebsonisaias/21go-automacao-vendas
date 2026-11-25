import type { MetadataRoute } from 'next'

const URL_SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br').replace(/\/+$/, '')
const PRIVADO = ['/admin', '/api/', '/cliente', '/vistoria', '/pagamento', '/carteirinha']

/**
 * robots.txt: o site público aberto; painel, área do cliente e etapas do cadastro fechados. Os robôs
 * de busca das IAs (que citam o site com link) estão nomeados para ficar claro que podem entrar.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVADO },
      { userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'PerplexityBot'], allow: '/', disallow: PRIVADO },
    ],
    sitemap: `${URL_SITE}/sitemap.xml`,
    host: URL_SITE,
  }
}
