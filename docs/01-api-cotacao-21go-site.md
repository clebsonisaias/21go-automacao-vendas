# 01 — Mapeamento da API de Cotação (`https://21go.site/cotacao`)

Análise completa do fluxo público de cotação do site **21Go** (Next.js App Router, bundle principal `app/cotacao/page-f01543109eaf441b.js`).

---

## 1. Endpoints de Consulta de Veículo e FIPE

Todas as rotas respondem em `https://21go.site/api/...` sem exigir autenticação:

### 1.1 Consulta por Placa
Disparada automaticamente após digitar uma placa válida de 7 caracteres (`ABC1234` ou padrão Mercosul `ABC1D23`):
- **Endpoint:** `GET https://21go.site/api/vehicle/plate-identify/{PLACA}`
- **Campos principais da resposta:**
  - `status`: `"found"` | `"partial"` | `"notfound"`
  - `tipo`: `"carro"` | `"moto"`
  - `brandId`, `brandText`, `year`, `modelId`, `modelText`, `codFipe`, `label`, `cor`
  - `candidates`: `[{ code, name, codFipe }]` (quando há mais de um modelo compatível)

### 1.2 Marcas, Anos e Modelos (PowerCRM)
- **Marcas:** `GET https://21go.site/api/vehicle/powercrm/marcas?tipo={carro|moto}`
  - Exemplo de resposta: `{"success": true, "data": [{"code": "27", "name": "Fiat"}, ...]}`
- **Anos:** `GET https://21go.site/api/vehicle/powercrm/anos`
  - Exemplo de resposta: `{"success": true, "data": [{"code": "2027", "name": "2027"}, ..., {"code": "1995", "name": "1995"}]}`
- **Modelos (com código FIPE):** `GET https://21go.site/api/vehicle/powercrm/modelos?marca={brandId}&ano={year}`
  - Exemplo de resposta: `{"success": true, "data": [{"code": "917", "name": "ARGO 1.0 6V Flex", "codFipe": "001509-1"}, ...]}`

---

## 2. API Oficial de Preços e Planos (`powercrm/preco`)

Os valores mensais dos planos **não ficam em tabela estática no front-end** — eles vêm em tempo real do motor de precificação do PowerCRM via backend da 21Go.

- **Endpoint:** `POST https://21go.site/api/vehicle/powercrm/preco`
- **Headers:** `Content-Type: application/json`
- **Body (Exemplo):**
```json
{
  "tipo": "carro",
  "brandId": "27",
  "brandText": "Fiat",
  "modelId": "917",
  "modelText": "ARGO 1.0 6V Flex",
  "year": "2020",
  "codFipe": "001509-1",
  "leilao": "nao",
  "carroApp": "nao"
}
```
> Valores aceitos:
> - `tipo`: `"carro"` | `"moto"`
> - `leilao`: `"nao"` | `"leilao"` | `"remarcado"`
> - `carroApp`: `"nao"` | `"sim"`

- **Resposta Observada (`200 OK`):**
```json
{
  "success": true,
  "vehicle": {
    "marca": "Fiat",
    "modelo": "ARGO 1.0 6V Flex",
    "ano": "2020",
    "fipeValue": 51919,
    "fipeCode": "001509-1",
    "categoria": "AUTOMOVEL",
    "combustivel": "Flex"
  },
  "powercrm": {
    "brandId": 27,
    "modelId": 917,
    "yearId": 105
  },
  "plans": [
    { "id": "basico", "name": "Básico", "monthly": 202.49 },
    { "id": "do-seu-jeito", "name": "Do Seu Jeito", "monthly": 214.5 },
    { "id": "vip", "name": "VIP", "monthly": 269.53, "popular": true },
    { "id": "premium", "name": "Premium", "monthly": 341.75 }
  ]
}
```
> Em caso de veículo fora de aceitação ou indisponível: retorna `success: false`, `excluded: true` ou `requires_human_support: true` com `reason: "elegibilidade_indisponivel" | "fipe_indisponivel"`.

---

## 3. Regras de Cálculo no Front-end (Ativação, Descontos e Coberturas)

Extraídas do bundle da página `/cotacao`:

1. **IDs de Planos Suportados (8 faixas):**
   - `basico`, `do-seu-jeito`, `vip` (`popular: true`), `premium`, `suv` (`VIP SUV`), `moto-400`, `moto-1000`, `especial` (`Veículos Especiais`).
2. **Adicional Opcional para Moto:**
   - `+ R$ 22,00/mês` somados no front-end aos planos `moto-400` / `moto-1000` quando `danosTerceiros === "sim"`.
3. **Taxa de Ativação / Adesão:**
   - Se `marca === "BYD"`: valor fixo de **R$ 1.550,00**.
   - Fórmula padrão:
     ```js
     // priorityPlanMonthly = primeiro plano disponível na ordem:
     // ["vip", "suv", "moto-1000", "moto-400", "especial", "premium", "do-seu-jeito", "basico"]
     const ativacao = Math.max(Math.max(priorityPlanMonthly, selectedPlanMonthly) + 100, 249);
     ```
     *Exemplo (Argo VIP R$ 269,53):* `269.53 + 100 = R$ 369,53` no Pix.
4. **Desconto de Pontualidade (1º Pagamento):**
   - **5% de desconto** (`monthly * 0.95`).
   - Vencimento: dia **10** do mês seguinte (se hoje for dia <= 15) ou dia **20** do mês seguinte (se hoje for dia > 15).
5. **Desconto Adesivo 21Go:**
   - **Não aplicado** para motos (`moto-400` / `moto-1000`), marcas elétricas/híbridas (`BYD`, `TESLA`, `GWM`, `ZEEKR`, `NETA`, `ORA`) ou modelos com termos `ELETRIC`, `HIBRID`, `HYBRID`, `RECHARGE`, `E-TECH`, `E:HEV`, `EV`, `BEV`, `HEV`, `PHEV`, `MHEV`.
   - **Percentual:**
     - **15%** se `fipeValue > 30000` (planos `vip`, `suv`, `especial`) ou `fipeValue > 60000` (demais planos).
     - **10%** nos demais casos elegíveis.
   - Cumulativo com pontualidade: `monthly * (1 - pct / 100) * 0.95`.
6. **Cota de Participação:**
   - Não é retornada pelo `/api/vehicle/powercrm/preco` nem exibida na tela de cotação.
7. **Vistoria Presencial na Sede:**
   - O front-end possui listas de regex para alertar exigência de vistoria presencial em modelos específicos (ex.: Audi, Volvo, BYD 2023–2024/EVs, Focus Aut., Jetta, etc.).

---

## 4. Fluxo de Envio & "Quero Contratar" no Site Oficial

Quando o usuário clica em **"Ver Simulação"** no site oficial `21go.site`:
1. `POST /api/vehicle/valida-whatsapp` (`{ "whatsapp": "..." }`)
2. `POST /api/vehicle/powercrm/preco` (obtém FIPE + preços)
3. `POST /api/vehicle/lead` (cria o lead e gera negociação/cotação no PowerCRM da matriz — retorna `leadId`, `quotationCode`, `negotiationCode`).

Quando clica em **"Quero contratar"** / **"Tenho uma dúvida"**:
- Não existe checkout de pagamento no site; ele apenas dispara eventos de tracking (`/api/whatsapp-clicked`, `/api/vehicle/lead/{leadId}/whatsapp-click`, `/api/track`) e redireciona para o WhatsApp via:
  - `https://21go.site/api/wa?[c={consultorSlug}&]text={resumoCodificado}`

> **Importante para a Franquia:** No nosso site próprio, devemos chamar **somente** os endpoints das seções 1 e 2 (`plate-identify`, `marcas`, `anos`, `modelos`, `powercrm/preco`) e **NUNCA** enviar para `https://21go.site/api/vehicle/lead`. Em vez disso, enviamos o lead para o **nosso CRM** (`crm21go.site/api`) e abrimos o **nosso WhatsApp**.

---

## 5. Descoberta Extra: Roteamento Nativo de Consultor na 21Go

O site `21go.site` também possui suporte nativo a links personalizados de consultor:
- **Slug de consultor:** `https://21go.site/{slug}` (consulta `GET /api/consultor/{slug}`) — redireciona o botão de WhatsApp (`c={consultorSlug}`) e anexa PDF do lead (`/api/pdfs/{leadId}`).
- **Indicação (Member-Get-Member):** `?ind={codigo}` (persistido por 90 dias em `_21go_ind`).
- **Parâmetros de rastreio:** `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ttclid`.
