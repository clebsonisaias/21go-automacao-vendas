# 02 — Mapeamento da API do CRM 21 Go (`https://www.crm21go.site`)

Documentação completa dos endpoints internos, autenticação, identificação de vendedor/tenant e recursos de automação do **CRM 21 Go**.

---

## 1. Disponibilidade de Webhooks / API Keys na Interface

- **Não existe** painel de configurações de API Key, Webhook de entrada ou Formulário Público na UI do CRM.
- As únicas rotas públicas do bundle são:
  - `GET /api/orcamento/:code/proposta.pdf` (PDF público de proposta)
  - `GET /api/publico/consultores`
- **Solução para integração:** usar um backend intermediário (Node.js, Python ou n8n) que faz login via `POST /api/auth/login`, mantém o token renovado via `POST /api/auth/refresh` e envia as chamadas autenticadas com `Authorization: Bearer <token>`.

---

## 2. Autenticação e Identificação do Vendedor (Multi-Tenant)

- **Base URL:** `https://www.crm21go.site/api`
- **Login:** `POST /api/auth/login` com `{ "email": "...", "password": "..." }` → retorna `{ user, token, refreshToken }`.
- **Refresh:** `POST /api/auth/refresh`
- **Identidade ativa:** `GET /api/auth/me`
- **Como o CRM vincula o lead ao vendedor correto:**
  O servidor extrai a identidade diretamente do JWT enviado no header `Authorization: Bearer <token>`:
  - `user.id`: `ff0b0d6b-4b68-4434-9407-498a8a462200`
  - `role`: `vendedor` *(hierarquia no sistema: `admin=10`, `gestor=7`, `vendedor=5`, `operacao`, `auxiliar=1`)*
  - `companyId`: `company-21go` (`slug: "21go"`)
  - `pipeId` (**Vendas Power**): `a41be931-04d2-46da-a0c4-1406c3c4e114`
  - **Tempo real (Socket.IO):** sala `company:company-21go`.

---

## 3. Etapas Fixas do Funil `Vendas Power`

Pipe UUID: `a41be931-04d2-46da-a0c4-1406c3c4e114` *(espelhado do Power CRM)*

| Posição | Nome da Etapa | `phaseId` (UUID) | Flags |
|---:|---|---|---|
| 1 | **Cotações recebidas** | `7a0c33a6-0935-4fba-aa5c-0c13f9efb4a3` | `isWon: false`, `isLost: false` |
| 2 | **Em negociação** | `a6a56a07-ebd6-4868-a929-0ebbfd6dbc20` | `isWon: false`, `isLost: false` |
| 3 | **Vistorias** | `5397b4ff-b878-4f82-b505-dd6c27695392` | `isWon: false`, `isLost: false` |
| 4 | **Liberadas para cadastro** | `d3b06d15-bbce-4e49-a756-12e5d1bd0349` | `isWon: false`, `isLost: false` |
| 5 | **Vendas concretizadas** | `69a6c60c-048d-437e-9652-ed185c83c9f8` | `isWon: true`, `isLost: false` |

---

## 4. Endpoints de Criação de Lead / Card

Existem **4 caminhos** conforme o nível de detalhamento desejado:

1. **Nova Negociação / Novo Lead no Power (Recomendado para o funil Vendas Power):**
   - `POST /api/negociacoes/lead`
   - Payload: `{ nome, telefone, email, placa, chassi, motor, codigoFipe, tipoVeiculo, marcaId, modeloId, anoModeloId, cidadeId, workVehicle, liberarPlacaTravada }`
   - Referências auxiliares:
     - `GET /api/negociacoes/referencias`
     - `GET /api/negociacoes/referencias/cidades/:uf`
     - `GET /api/negociacoes/referencias/marcas/:tipo`
     - `GET /api/negociacoes/referencias/modelos/:marca`
     - `GET /api/negociacoes/referencias/anos/:modelo`
     - `GET /api/negociacoes/placa/:placa`
     - `GET /api/placas/:placa/status`

2. **Card Direto no Kanban (Mais simples — sem depender de IDs FIPE):**
   - `POST /api/pipes/a41be931-04d2-46da-a0c4-1406c3c4e114/cards`
   - Payload: `{ "title": "Nome - Veículo", "phaseId": "7a0c33a6-0935-4fba-aa5c-0c13f9efb4a3" }`
   - Complemento opcional: `PUT /api/pipes/cards/:cardId/contato` e `PATCH /api/pipes/cards/:cardId`.

3. **Cotação Rápida:**
   - `POST /api/cotacao-rapida`
   - Payload: `{ nome, telefone, email, cpf, modeloId, anoModeloId, cidadeId, workVehicle }`

4. **Lead Avulso / Conversão de WhatsApp:**
   - `POST /api/leads`
   - `POST /api/conversations/:id/convert-to-lead`

---

## 5. Mapa Completo de Endpoints para Automação da Venda

### Leitura de Funil e Cards
- `GET /api/pipes` | `GET /api/pipes/:pipeId`
- `GET /api/pipes/:pipeId/kanban` | `GET /api/pipes/:pipeId/cards`
- `GET /api/pipes/:pipeId/buscar?q=...` | `GET /api/pipes/:pipeId/phases/:phaseId/cards`
- `GET /api/pipes/cards/:cardId`

### Movimentação de Etapas
- Mover card no Kanban: `PATCH /api/pipes/cards/:cardId/move` com `{ "phaseId": "<uuid>" }`
- Transferir de funil: `PATCH /api/pipes/cards/:cardId/transfer` com `{ "targetPipeId": "...", "targetPhaseId": "..." }`
- Mover etapa na negociação Power: `POST /api/negociacoes/:id/mover` com `{ "etapa": "..." }`

### Atualização de Negociação, Planos e Valores
- `PATCH /api/pipes/cards/:cardId` | `DELETE /api/pipes/cards/:cardId`
- `PUT /api/pipes/cards/:cardId/contato` | `PUT /api/pipes/cards/:cardId/comercial`
- `PATCH /api/pipes/cards/:cardId/fields` | `POST /api/pipes/cards/:cardId/attachments`
- `GET /api/negociacoes` | `GET /api/negociacoes/:id`
- `POST /api/negociacoes/:id/veiculos`
- `PUT /api/negociacoes/:id/plano`
- `PUT /api/negociacoes/:id/cotacoes/:cotId`
- `PUT /api/negociacoes/:id/cotacoes/:cotId/valores`
- `PUT /api/negociacoes/:id/cotacoes/:cotId/adicionais`
- `PATCH /api/negociacoes/:id/cotacoes/:cotId/observacoes` (`observacaoTermo`, `observacaoInterna`)

### Fechamento (Ganho / Perdido) e Vistoria
- **Aceite / Venda Concretizada:**
  - `POST /api/negociacoes/:id/aceite` (`{ "cotacaoId": "..." }`)
  - Mover card para `69a6c60c-048d-437e-9652-ed185c83c9f8` (**Vendas concretizadas**)
- **Arquivar / Perdido no Power:**
  - `GET /api/vistoria-propria/:negociacaoId/arquivar/placas`
  - `POST /api/vistoria-propria/:negociacaoId/arquivar` *(códigos de motivo: `2166` Desistência, `7081` Placa cadastrada, `1447` Teste)*
- **Documentos e Vistoria:**
  - `GET/POST /api/pipes/cards/:cardId/documentos` | `PATCH/DELETE /api/pipes/cards/documentos/:docId`
  - `GET /api/pipes/cards/:cardId/historico`
  - `GET/POST /api/vistoria-propria/:negId/documentos-pedidos` | `POST /api/vistoria-propria/:negId/pedir-documento`

### Tarefas, WhatsApp, ISA (Bot) e Cotação em Lote
- **Tarefas:** `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `GET/POST /api/leads/:id/tasks`
- **WhatsApp:** `/api/whatsapp` (`/status`, `/logout`, `/reconfigure-webhook`), `/api/conversations` (`GET/POST /messages`, `/status`, `/read`, `/convert-to-lead`)
- **Atendimento ISA:** `/api/atendimento-isa/*` (`/bot`, `/contatos`, `/conversa`, `/responder`, `/responder-arquivo`, `/responder-audio`, `/isa`, `/transferir`, `/resolvido`, `/etiquetas`, `/funil`, `/nota`, `/lembretes`)
- **Cotação Leticya (em lote):** `/api/cotacao-leticya` (`POST /cotacao-leticya`, `/lote/:id`, `/lote/:id/continuar`, `/lote/:id/plano`, `/lote/:id/valores`, `/lote/:id/pdf`)
- **E-mail:** não há API de disparo de e-mail no CRM (caso necessário, disparar via serviço externo como Resend/SMTP no middleware).
