# 21Go — automação de vendas

Site de cotação e venda da franquia 21Go (Next.js 15, publicado no Coolify como `21go-cotacao`, a partir da `main`, em https://21go.seg.br).

## UI/UX skills

Taste, a11y, bans, voice, and icon library for this project live in `.ux-profile.md`.
Run `setup-ui-ux-skills` again only to change those defaults.
Before UI or microcopy work, read `.ux-profile.md`, then the matching domain skill (page-patterns, viewports, forms, surfaces, loaders, empty-states, copy, motion).
Before creating a new page, read `page-patterns` and name the pattern. Do not write page markup until the pattern is named.
Layouts must pass `viewports` at 375px and 1280px.
Before finishing UI, run `ux-audit`.

## Artes e posts do Instagram (@citmax.21go)

Regra do Clebson: toda arte do Instagram segue o **manual de artes**, em `docs/MANUAL_ARTES_INSTAGRAM.md` (PDF original em `docs/manual-artes-instagram-21go.pdf`). Vale sempre que pedirem para criar ou postar algo.

- Feed (1080×1350) e story (1080×1920) saem juntos, com o mesmo conteúdo.
- Arte nova sai pelo modelo `src/lib/arte-instagram.tsx` (rota `/api/social/arte/<id>`), preenchendo os campos do post em `src/lib/social-content.ts`. O passo a passo está na seção 07 do manual.
- Antes de publicar:
  - passar pela trava `problemasDoTexto` (`src/lib/arte-regras.ts`);
  - fazer a conferência da seção 06;
  - mostrar a prévia de feed e story ao Clebson.
- Não fazer arte fora do padrão: outra fonte, cor fora da paleta, preço, "seguro", SUSEP, marca ou modelo de carro.

## Vendas, marketing e SEO (skills do projeto)

- Skills em `.claude/skills/` (lista e origem no `README.md` de lá): `cro`, `copywriting`, `seo-audit`, `programmatic-seo`, `analytics`, `emails`, `sms` (WhatsApp), `competitors`, `referrals`, `marketing-ideas`, `product-marketing` e `local-client-prospector` (achar empresas parceiras).
- Contexto do produto para elas: `.claude/product-marketing.md` (planos, público, palavras proibidas). Atualize quando algo mudar.
- Todo texto público novo (página, WhatsApp, legenda, prompt de IA) passa pelo subagente `revisor-texto-publico` antes do PR.
- `/seo`: plugin claude-seo ligado em `.claude/settings.json`; na primeira vez, `/seo setup`.
- Hooks (`.claude/hooks/protecao.mjs`): o Claude não edita `.env*`, `.coolify.local` nem `data/`, e o `git commit` só sai com `npm test` passando.
