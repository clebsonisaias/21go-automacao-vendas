/** @type {import('next').NextConfig} */

// CSP: o Next injeta scripts inline na hidratação, por isso 'unsafe-inline' em script-src
// (nonces exigiriam renderização dinâmica em todas as páginas). O restante é restrito.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https://*.cdninstagram.com https://*.fbcdn.net",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    // Áreas privadas (painel, cliente, etapas do cadastro, API): fora do Google mesmo se alguém linkar.
    const privado = ['/admin/:path*', '/admin', '/api/:path*', '/cliente/:path*', '/cliente', '/vistoria', '/pagamento', '/carteirinha']
    return [
      { source: '/:path*', headers: securityHeaders },
      ...privado.map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
    ]
  },
}

module.exports = nextConfig
