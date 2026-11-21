# CONTEXTO_IA — Canal de colaboração Grok ↔ Claude

**Repositório:** `clebsonisaias/21go-automacao-vendas`  
**Última atualização:** 2026-11-21  
**Iniciado por:** Grok (xAI)

Este arquivo é o canal oficial de comunicação entre o **Grok** e o **Claude** neste repositório.  
Ambos devem **ler este arquivo no início** de qualquer sessão e **atualizar** quando tomarem decisões ou fizerem mudanças relevantes.

---

## 1. Objetivo atual

Migrar / consolidar o pagamento da taxa de adesão para o **Mercado Pago (Pix via Orders API)**, removendo qualquer dependência anterior da **Cora** (se ainda existir).

Fluxo desejado:
```
Cotação → Cadastro → /pagamento (Pix Mercado Pago) → Confirmação → Link da Vistoria → Vistoria → Aprovação
```

---

## 2. Estado atual da integração Mercado Pago (visto pelo Grok em 2026-11-21)

### Já implementado
- `src/lib/mercadopago.ts` — criação de order Pix, consulta, validação de assinatura de webhook, helpers de status
- `src/app/api/webhooks/mercadopago/route.ts` — webhook com validação HMAC-SHA256, responde 200 e processa em background
- `src/app/api/pagamento/pix/route.ts` — gera ou reaproveita Pix (idempotente)
- `src/app/api/pagamento/status/route.ts` — polling de status
- `src/instrumentation-node.ts` — reconciliador a cada 60s
- Seção no README explicando o fluxo e as variáveis de ambiente

### Variáveis necessárias (`.env`)
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `MP_PIX_EXPIRATION` (opcional, padrão PT1H)
- `QUOTE_SIGNING_SECRET`
- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

### O que ainda não foi confirmado
- Se existe algum código ou fluxo residual da **Cora**
- Se o webhook já está cadastrado e funcionando em produção
- Se o fluxo completo (cotação → Pix → vistoria liberada) foi testado de ponta a ponta

---

## 3. Decisões tomadas

| Data | Decisão | Autor |
|------|---------|-------|
| 2026-11-21 | Usar Orders API do Mercado Pago (Pix) como único meio de pagamento da taxa de adesão | Grok + Claude (em andamento) |
| 2026-11-21 | Confirmação em 3 camadas: webhook + polling + reconciliador | Já implementado |

---

## 4. Próximos passos (para o Claude preencher / executar)

- [ ] Confirmar se ainda existe qualquer referência à Cora no código ou documentação e remover
- [ ] Revisar o webhook e o fluxo de `syncPaymentFromOrder`
- [ ] Garantir que a vistoria só é liberada após pagamento confirmado
- [ ] Atualizar este arquivo com o que foi feito
- [ ] Testes de ponta a ponta (se possível)

---

## 5. Log de atualizações

- **2026-11-21 — Grok:** Arquivo criado. Integração Mercado Pago já está bastante avançada. Aguardando Claude revisar, completar e continuar a partir daqui.

---

**Instruções para qualquer IA:**
1. Leia este arquivo no início da sessão.
2. Ao tomar decisões ou fazer mudanças relevantes, atualize as seções correspondentes e adicione uma linha no Log.
3. Seja conciso e objetivo. O objetivo é manter o contexto alinhado entre Grok e Claude.
