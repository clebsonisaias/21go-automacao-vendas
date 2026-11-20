/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Laranja 21Go (cone de obra)
        cone: { DEFAULT: '#F5600A', dark: '#C94A00', soft: '#FFE3D1' },
        // Azul da faixa superior da placa Mercosul
        azul: { DEFAULT: '#17348F', dark: '#0F2468' },
        // Tinta: texto principal
        tinta: '#0E1A3B',
        // Fundo de página
        concreto: { DEFAULT: '#E7E9EC', dark: '#D3D7DD' },
        // Verde: somente WhatsApp e confirmações
        verde: { DEFAULT: '#0B7F3E', dark: '#096833' },
        erro: '#B42318',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        placa: '14px',
      },
    },
  },
  plugins: [],
}
