# 03 — Arquitetura e Plano de Automação de Vendas (Franquia 21Go)

Este documento descreve o que podemos construir para **automatizar o máximo do processo comercial**, captando clientes com **preço oficial exato** no nosso site e garantindo **100% do fechamento na nossa conta/franquia**.

---

## 1. Estratégia Central (Cotação Oficial + Fechamento Próprio)

| Etapa | Onde acontece | O que faz |
|---|---|---|
| **1. Simulação** | Nosso Site + Nosso Backend Proxy | Cliente informa placa (ou marca/ano/modelo). Nosso backend consulta `21go.site/api/vehicle/plate-identify/{PLACA}` e `POST 21go.site/api/vehicle/powercrm/preco`. **Nenhum dado pessoal vai para `21go.site/api/vehicle/lead`.** |
| **2. Exibição dos Planos** | Nosso Site | Mostra os 4+ planos com valores oficiais exatos, taxa de ativação calculada, opção de desconto de pontualidade (5%) e adesivo (10%/15%). |
| **3. Captura / Contratação** | Nosso Site → Nosso Backend | Cliente preenche nome + WhatsApp (somente se quiser fechar ou receber a proposta) e clica em **"Quero Contratar"**. |
| **4. Entrada no Nosso CRM** | Nosso Backend → `crm21go.site/api` | Nosso backend autentica com nosso JWT (`POST /api/auth/login`) e cria o lead em `POST /api/negociacoes/lead` (ou `POST /api/pipes/.../cards`) diretamente no nosso funil **Vendas Power** (`Cotações recebidas`). |
| **5. Atendimento Imediato** | WhatsApp + IA / Proposta PDF | Cliente é redirecionado para o **nosso WhatsApp** com a cotação preenchida **e/ou** recebe automaticamente o PDF da proposta (`GET /api/orcamento/:code/proposta.pdf`) + mensagem de boas-vindas. |
| **6. Follow-up & Avanço** | Automação (Cron / n8n / Worker) | Cria tarefa de retorno (`POST /api/tasks`), move card para **Em negociação** / **Vistorias** (`PATCH /api/pipes/cards/:cardId/move`), solicita documentos (`POST /api/vistoria-propria/:negId/pedir-documento`) e registra aceite (`POST /api/negociacoes/:id/aceite`). |

---

## 2. O Que Podemos Automatizar (Checklist por Nível)

### Nível 1 — MVP de Alta Conversão (Rápido de colocar no ar)
- [ ] **Landing Page de Cotação Própria (Next.js / React)** com consulta instantânea por placa.
- [ ] **Backend Proxy de Cotação** que consome `plate-identify` e `powercrm/preco` sem CORS e sem vazar leads para a matriz.
- [ ] **Regras exatas de preço** (Ativação, Pontualidade 5%, Adesivo 10%/15%, Moto +R$22, BYD R$1.550).
- [ ] **Integração direta com o CRM 21 Go** (`POST /api/negociacoes/lead` com renovação automática de JWT).
- [ ] **Redirecionamento para o nosso WhatsApp** com resumo completo do carro, FIPE e plano escolhido.

### Nível 2 — Automação Comercial (Aumentar taxa de fechamento)
- [ ] **Disparo automático no WhatsApp em < 10 segundos** após a cotação com a proposta em PDF.
- [ ] **Cadência de follow-up automática** (ex.: 2h, 24h, 3 dias) criando tarefas no CRM (`POST /api/tasks`) e enviando mensagens via WhatsApp/ISA se o card ainda estiver em `Cotações recebidas`.
- [ ] **Movimentação automática de colunas** conforme resposta do cliente (ex.: respondeu → move para `Em negociação`; enviou fotos/documentos → move para `Vistorias`).

### Nível 3 — Automação Completa de Pós-Aceite
- [ ] **Coleta guiada de vistoria e documentos** via WhatsApp com upload automático para `POST /api/pipes/cards/:cardId/documentos`.
- [ ] **Registro de aceite** via `POST /api/negociacoes/:id/aceite` e movimentação para `Vendas concretizadas`.
- [ ] **Monitoramento em tempo real** via Socket.IO (`company:company-21go`) ou polling no Kanban para dashboards próprios de conversão e ROI de anúncios (Meta Ads / Google Ads).

---

## 3. Pontos de Atenção Técnicos

1. **Proxy no Backend obrigatório (CORS):** o navegador do cliente pode bloquear chamadas diretas do nosso domínio para `https://21go.site/api/...` por política de CORS. Fazendo a chamada a partir do nosso servidor (Next.js API Routes / Node.js / n8n), não há bloqueio de CORS.
2. **Cache de Referências:** as rotas `/marcas`, `/anos` e `/modelos` raramente mudam — podemos cacheá-las no nosso servidor para deixar o site muito mais rápido que o site oficial.
3. **Renovação de JWT do CRM:** armazenar o `token` e `refreshToken` em memória/Redis no backend e renovar automaticamente ao receber `401 Unauthorized` (ou antes da expiração).
4. **Resiliência:** se o endpoint de preço da 21Go oscilar, exibir fallback amigável capturando placa + WhatsApp e jogando no nosso CRM como card simples (`POST /api/pipes/.../cards`) para o vendedor não perder o lead.
