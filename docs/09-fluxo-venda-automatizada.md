# 09 — Fluxo de Venda Automatizada 21Go

**Mercado Pago (Pix da adesão) + CITchat/AtendeHub + CRM 21Go + Hinova SGA (Mensalidades Recorrentes)**

---

## 1. Regras de Negócio e Responsabilidades

| Componente | Responsabilidade | Mecanismo |
|---|---|---|
| **Taxa de Adesão (Entrada Única)** | **Mercado Pago** | Pix via Orders API (`POST /v1/orders`) + webhook `order` assinado (`/api/webhooks/mercadopago`) |
| **Mensalidades Recorrentes** | **CRM 21Go + Hinova SGA** | Boletos mensais gerados no SGA após a ativação do associado |
| **Disparo de Mensagens WhatsApp** | **CITchat (AtendeHub)** | Gateway oficial CITmax (`/gateway/sms`) |
| **Vistoria Digital Prévia** | **CRM 21Go (Vistoria Própria)** | Link PWA com câmera ao vivo, GPS e validação |

---

## 2. Fluxo Completo de Auto-Contratação

1. Cliente cota e preenche dados no site.
2. Paga a **taxa de adesão** via **Pix do Mercado Pago** na página `/pagamento` (webhook ou polling confirma o pagamento; o valor é fixado pelo servidor).
3. Backend anexa CNH + CRLV no card do CRM.
4. Backend gera o link de vistoria no CRM (`POST /api/vistoria-propria/{negociacaoId}`).
5. **CITchat** envia o link da vistoria por WhatsApp.
6. Cliente realiza a vistoria no link do CRM.
7. Após aprovação, backend envia para o **Hinova SGA** (`POST /api/sga/{negociacaoId}/enviar`).
8. SGA gera as **mensalidades recorrentes**.
9. **CITchat** envia o boleto / informação por WhatsApp.

---

## 3. Endpoints e Orquestração Técnica

| # | Etapa | Endpoint / Ação | Responsável | Status |
|---|------|------------------|-------------|----------------|
| 1 | Criar lead / cotação | `POST /api/negociacoes/lead` | Backend | Ativo |
| 2 | Confirmar adesão única | Webhook `order` Mercado Pago (+ polling/reconciliador) | Mercado Pago → Backend | **Implementado** |
| 3 | Anexar CNH + CRLV | `POST /api/pipes/cards/{cardId}/documentos` | Backend | Mapeado |
| 4 | Gerar link de vistoria | `POST /api/vistoria-propria/{negociacaoId}` | CRM 21Go | Testado (200 OK) |
| 5 | Enviar link por WhatsApp | Gateway CITchat | CITchat | **Testado (200 OK)** |
| 6 | Cliente realiza vistoria | Link PWA do CRM | Cliente | Mapeado |
| 7 | Enviar para Hinova SGA | `POST /api/sga/{negociacaoId}/enviar` | Backend | Mapeado |
| 8 | Obter boletos gerados | API Hinova SGA | Hinova SGA | Documentado |
| 9 | Enviar boletos por WhatsApp | Gateway CITchat | CITchat | **Testado (200 OK)** |

---

## 4. Integração do Gateway CITchat (Validada em Produção)

- **URL de Disparo:**
  `$CITCHAT_GATEWAY_URL?token=$CITCHAT_GATEWAY_TOKEN` (variáveis de ambiente; o token **não** fica versionado)
- **Método:** `POST`
- **Headers:** `Content-Type: application/json`
- **Payload Homologado:**
```json
{
  "recipient": "5584992187662",
  "body": "Olá! Segue o link da sua vistoria digital: https://crm21go.site/vistoria/XXXX"
}
```
- **Resposta de Confirmação:**
```json
{
  "success": true,
  "recipient": "5584992187662",
  "status": "enviado_template",
  "janela": false
}
```

---

## 5. Pontos Críticos e Regras de Segurança

1. **Adesão vs Mensalidade:**
   - O **Mercado Pago** cobra apenas a taxa de adesão inicial (Pix único).
   - As mensalidades seguintes são geradas pelo **Hinova SGA / CRM**.
2. **Pré-requisito da Vistoria:**
   - O link de auto-vistoria exige que o card já tenha CPF, CNH e CRLV.
3. **Ativação SGA:**
   - O disparo para o Hinova SGA só deve ocorrer **após** a aprovação da vistoria.

---

## Status Atual

O fluxo está documentado. Os pontos técnicos principais (Gateway CITchat e endpoints do CRM) foram validados. Ainda falta a orquestração completa no backend para que o cliente consiga assinar sozinho.
