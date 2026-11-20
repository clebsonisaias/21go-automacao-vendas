# 21Go Franquia — guia para quem altera este projeto

Next.js 15 (App Router) + Tailwind. Landing de cotação, vistoria digital e painel interno.

## Design: toda página nova segue o padrão existente

As telas de referência são a home (`src/app/page.tsx`), `/vistoria`, `/admin` e `/admin/login`.
Não crie um visual novo: reaproveite estes elementos.

- **Tokens** (`tailwind.config.js`): `navy-*` (fundos escuros e texto), `go-orange` (ação principal),
  `go-lime` (destaque/ok), `go-whatsapp`, `surface-50/100` (fundos claros), `line`, `muted*`. Fonte Inter.
  Nunca use cores soltas (`slate-*`, hex avulso) quando existir token.
- **Cabeçalho**: faixa `bg-navy-950` com `<Logo />` de `src/components/home/SiteChrome.tsx`
  (`href` e `subtitle` configuráveis). Páginas internas usam cabeçalho simples; a home usa `SiteHeader`/`TopBar`/`SiteFooter`.
- **Página**: fundo `bg-surface-50`, conteúdo em `max-w-[1200px]` (formulários: `max-w-[440px]` a `820px`), gutter de 20–24px.
- **Cards**: `rounded-2xl border border-line bg-white shadow-card`. Seções escuras: `bg-navy-950 text-white rounded-2xl`.
- **Botão primário**: `bg-go-orange text-navy-950 font-extrabold rounded-lg min-h-[54px] hover:shadow-cta`.
  Secundário: `border-2 border-navy-800 text-navy-800`. Alvos de toque com no mínimo 44px.
- **Campos**: `<label>` visível sempre, `min-h-[48px] rounded-lg border border-[#c9d1e6] px-3.5`; erro inline
  em `<p role="alert" class="bg-red-50 text-red-700">` (nada de `alert()`).
- **Textos**: português do Brasil; botões começam com verbo ("Enviar documentos", "Entrar").
- **Responsivo e acessível**: funcionar de 375px a 1440px sem rolagem horizontal da página; foco visível;
  `aria-label` em botões só com ícone; ícones `lucide-react` com `aria-hidden`.

## Segurança (regras do projeto)

- **Nunca** coloque senha, token, e-mail de acesso ou chave de API no código ou no Git. Tudo vem de variáveis
  de ambiente (ver `.env.example`).
- `/admin` e `/api/admin/*` exigem sessão (`src/lib/admin-auth.ts`, `src/middleware.ts`); a própria rota da API
  também confere a sessão. Rotas novas do painel entram sob esses prefixos.
- Toda rota pública que grava ou dispara mensagem (CRM, Telegram, WhatsApp) valida a entrada, limita por IP
  (`src/lib/rate-limit.ts`) e não devolve `err.message` ao cliente. Texto de usuário no Telegram passa por `esc()`.
- `data/` guarda cadastros de clientes (CPF, WhatsApp) e não pode ir para o Git.
- Antes de subir dependências ou rotas novas: `npx tsc --noEmit`, `pnpm build` e `pnpm audit --prod`.

## Variáveis no Coolify

`NEXT_PUBLIC_FRANQUIA_*` são embutidas no build (marcar como variável de build). `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(e opcional `ADMIN_SESSION_SECRET`) são de execução. Monte um volume persistente em `/app/data`.
