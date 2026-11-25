# Skills do Claude neste repositório

Ficam no projeto (e não em `~/.claude`) para valer em toda sessão, inclusive na nuvem, que é apagada ao fechar. Antes de usar qualquer uma, o Claude lê `.claude/product-marketing.md` (contexto do 21Go: produto, público, palavras proibidas). Todo texto público que sair delas passa pelo subagente `revisor-texto-publico` (`.claude/agents/`).

| Skill | Para quê | Origem | Licença |
|---|---|---|---|
| `cro` | Converter mais numa página ou formulário (a cotação pela placa) | coreyhaines31/marketingskills | MIT |
| `copywriting` | Textos de página (home, páginas por cidade) | coreyhaines31/marketingskills | MIT |
| `seo-audit` | Auditoria de SEO, inclusive SEO local | coreyhaines31/marketingskills | MIT |
| `programmatic-seo` | Páginas em escala (cidades) sem virar página fina | coreyhaines31/marketingskills | MIT |
| `analytics` | Plano de medição (GA4, eventos, UTMs) | coreyhaines31/marketingskills | MIT |
| `emails` | Sequências automáticas (adaptar para WhatsApp) | coreyhaines31/marketingskills | MIT |
| `sms` | WhatsApp: templates, janela de 24h, opt-in | coreyhaines31/marketingskills | MIT |
| `competitors` | Páginas de comparação (cuidado: sem citar concorrente pelo nome) | coreyhaines31/marketingskills | MIT |
| `referrals` | Indicação e parceiros (recompensa, regras) | coreyhaines31/marketingskills | MIT |
| `marketing-ideas` | Ideias de crescimento | coreyhaines31/marketingskills | MIT |
| `product-marketing` | Manter o `.claude/product-marketing.md` | coreyhaines31/marketingskills | MIT |
| `local-client-prospector` | Achar empresas parceiras (oficinas, lojas de moto, despachantes, empresas para cupom de funcionários) | farshidghyasi/claude-prospector-skills | MIT |

- **Versões:** marketingskills no commit `8fd2fcade2fd6629026e9dfe6d133b55b36968b9` (instaladas com `npx skills add coreyhaines31/marketingskills --skill … -a claude-code --copy`, registro em `skills-lock.json`). O repositório renomeou algumas desde o pedido: page-cro e form-cro viraram `cro`, analytics-tracking virou `analytics`, email-sequence virou `emails`, competitor-alternatives virou `competitors`, referral-program virou `referrals`. Prospector no commit `66121b05ca3487b409081d7416bbcf733de18fe7`.
- **Atualizar:** `npx skills update -p` (depois conferir o diff antes do commit: skill é instrução para o Claude).
- **SEO completo (`/seo`):** o plugin claude-seo (AgriciDaniel/claude-seo, MIT) é ligado em `.claude/settings.json`; numa sessão nova, rode `/seo setup` uma vez. Não use as extensões pagas (DataForSEO, Moz, Ahrefs) sem combinar.
- Cada pasta traz o `LICENSE` da origem.
