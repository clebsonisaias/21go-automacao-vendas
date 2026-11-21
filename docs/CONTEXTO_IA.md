# CONTEXTO_IA — Canal de colaboração Grok ↔ Claude

**Repositório:** `clebsonisaias/21go-automacao-vendas`  
**Última atualização:** 2026-11-21  
**Iniciado por:** Grok (xAI)

Este arquivo é o canal oficial de comunicação entre o **Grok** e o **Claude** neste repositório.  
Ambos devem **ler este arquivo no início** de qualquer sessão e **atualizar** quando tomarem decisões ou fizerem mudanças relevantes.

---

## 0. Como colaborar (perguntas e sugestões)

Vocês podem (e devem) tirar dúvidas um do outro e dar sugestões usando este arquivo.

- Escreva na seção **6. Perguntas e Sugestões** abaixo.
- Formato recomendado:
  ```
  ### [Grok / Claude] — 2026-11-21
  **Pergunta / Sugestão:** ...
  **Contexto:** ...
  **Resposta / Ação:** (quem responder preenche aqui)
  ```
- Sempre que responder ou agir, atualize o item e adicione uma linha no Log (seção 5).
- Seja direto e objetivo. O objetivo é deixar o sistema funcionando de verdade.

---

## 1. Objetivo atual

Deixar o fluxo de **cadastro** funcionando de ponta a ponta, puxando dados oficiais das APIs e enviando corretamente.

Fluxo desejado:
```
Cotação (dados oficiais) → Cadastro → Envio ao Power CRM + CRM 21Go → /pagamento (Pix Mercado Pago) → Confirmação → Link da Vistoria → Vistoria → Aprovação
```

Prioridades:
1. Cadastro puxando e enviando dados oficiais (placa, FIPE, marca/modelo/ano, cidade etc.).
2. Pagamento da adesão via Mercado Pago (Pix) estável.
3. Remover qualquer resquício de Cora (se existir).

---

## 2. Estado atual da integração Mercado Pago

### Já implementado
- `src/lib/mercadopago.ts` — criação de order Pix, consulta, validação de assinatura de webhook
- `src/app/api/webhooks/mercadopago/route.ts` — webhook com HMAC-SHA256
- `src/app/api/pagamento/pix/route.ts` — gera/reaproveita Pix
- `src/app/api/pagamento/status/route.ts` — polling
- `src/instrumentation-node.ts` — reconciliador a cada 60s
- Token assinado na cotação (valor da adesão controlado pelo servidor)

### Variáveis necessárias
`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `QUOTE_SIGNING_SECRET`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL`

---

## 3. Cadastro e dados oficiais (ponto atual de foco)

Arquivo principal: `src/app/api/quote/submit/route.ts`

O cadastro atualmente:
- Valida o payload e o token de cotação assinado
- Envia para o Power CRM (`sendLeadToPowerCrm`)
- Envia para o CRM 21Go (se configurado)
- Salva localmente
- Notifica Telegram + WhatsApp (CITchat/AtendeHub)

**O que precisa funcionar bem:**
- Puxar dados oficiais da cotação (placa, FIPE, marca, modelo, ano, cidade) e enviá-los corretamente para o Power CRM (com IDs reais, companyHash, etc.).
- Garantir que o lead chegue no CRM com os dados certos.
- Depois do cadastro, redirecionar para o Pix do Mercado Pago quando estiver ativo.

---

## 4. Decisões tomadas

| Data | Decisão | Autor |
|------|---------|-------|
| 2026-11-21 | Usar Orders API do Mercado Pago (Pix) como único meio de pagamento da taxa de adesão | Grok + Claude |
| 2026-11-21 | Confirmação de pagamento em 3 camadas (webhook + polling + reconciliador) | Já implementado |
| 2026-11-21 | Canal de perguntas e sugestões ativo neste arquivo | Grok |

---

## 5. Log de atualizações

- **2026-11-21 — Grok:** Arquivo criado. Integração Mercado Pago já avançada.
- **2026-11-21 — Grok:** Ativado modo de colaboração bidirecional (perguntas + sugestões). Foco agora em deixar o cadastro funcionando com dados oficiais das APIs.

---

## 6. Perguntas e Sugestões

### [Grok] — 2026-11-21
**Sugestão / Pergunta:** Claude, por favor revise o fluxo de cadastro em `src/app/api/quote/submit/route.ts` e em `src/lib/powercrm-lead.ts` (ou equivalente).  
Confirme se os dados oficiais da cotação (placa, FIPE, IDs de marca/modelo/ano, cidade) estão sendo puxados e enviados corretamente para o Power CRM.  
Se faltar alguma coisa ou se ainda houver resquício de Cora, ajuste e registre aqui o que fez.

**Contexto:** O usuário pediu para deixar funcionando, puxando os dados oficiais da API e mandando no caso de um cadastro.

**Resposta / Ação:** (Claude preenche)

---

**Instruções para qualquer IA:**
1. Leia este arquivo no início da sessão.
2. Use a seção 6 para perguntas e sugestões.
3. Ao agir, atualize o Log e marque o que foi resolvido.
