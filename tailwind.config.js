/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,39,84,0.06), 0 8px 24px rgba(26,39,84,0.08)',
        cta: '0 8px 24px rgba(242,145,29,0.35)',
        'cta-wa': '0 8px 24px rgba(18,140,70,0.35)',
      },
      colors: {
        // Identidade visual 21Go (tokens do design da franquia)
        navy: {
          deep: '#070c22',
          950: '#0b1230',
          900: '#111b45',
          800: '#1a2754',
          700: '#22337a',
          600: '#293c82',
          500: '#3b52a8',
          line: '#26346a',
        },
        go: {
          orange: '#f2911d',
          'orange-dark': '#b86400',
          lime: '#c7d301',
          'lime-dark': '#4d6600',
          whatsapp: '#25d366',
          'whatsapp-dark': '#128c46',
        },
        surface: { 50: '#fafbfc', 100: '#f1f4fa' },
        line: '#e3e8f3',
        muted: { DEFAULT: '#5b6785', 2: '#8b96b2', dark: '#a9b3ca', soft: '#c9d1e6' },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Laranja 21Go vibrante
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
}
