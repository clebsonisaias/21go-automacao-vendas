# Engenharia Reversa da API PowerCRM & Pipeline 21Go

Este documento consolida o mapeamento técnico e a engenharia reversa das APIs do **Power CRM** (`https://app.powercrm.com.br` e `https://site.powercrm.com.br/category/api/`) integradas à associação **21Go Proteção Patrimonial** (Company ID `252`).

---

## 1. Contexto e Identificadores do Consultor

- **Associação:** 21Go Associação de Proteção Patrimonial (CNPJ `40.902.817/0001-70`, `companyId: 252`)
- **Consultor / Franquia:** `CITmax` (Clebson Isaias)
- **Código do Consultor (`companyUserCode`):** `vrXbXyyq`
- **Código do Formulário Público (`formCode`):** `4QwWw1QV`
- **Funil de Vendas no Power CRM:** `6d5d6fbc-acbc-4c35-aff6-60c0f30abf28`
- **Link Oficial de Cotação Rápida:** `https://cotacao.me/P4lp6EOp?id=vrXbXyyq`
- **Pipeline de Negociações:** `https://app.powercrm.com.br/company/pipeline?funnel=6d5d6fbc-acbc-4c35-aff6-60c0f30abf28`

---

## 2. Endpoint de Entrada Pública de Leads (Sem Necessidade de Token de Admin)

O Power CRM disponibiliza um endpoint público de submissão direta de formulários dinâmicos. Ele não exige Bearer token de integração da associação nem credencial administrativa:

```http
POST https://app.powercrm.com.br/svQttnDynmcFrm
Content-Type: application/json; charset=UTF-8
Accept: application/json
```

### Payload oficial (conferido com o script do formulário em 2026-11-21)

Fonte: `https://resources.powercrm.com.br/assets/external/js/script.pwrcrm.js` (usado pelo cotacao.me).
Implementação: `src/lib/powercrm-lead.ts`.

```json
{
  "companyHash": "<lido de GET /frmByCd?code=FORM_CODE>",
  "formCode": "<POWERCRM_FORM_CODE>",
  "leadSource": "<leadSubSourceId ou leadSourceId do formulário>",
  "pipelineColumn": "<pipelineColumnId do formulário>",
  "companyUserCode": "<POWERCRM_CONSULTANT_CODE>",
  "clientName": "Nome do Cliente",
  "clientPhone": "(84) 99999-9999",
  "clientEmail": "cliente@email.com",
  "clientCity": "3779",
  "vehiclePlate": "ABC1D23",
  "vehicleType": "1",
  "vehicleBranch": "27",
  "vehicleModel": "917",
  "vehicleYear": "2022",
  "vehicleIsWork": false,
  "observation": "Plano, mensalidade, adesão, FIPE e CPF (não há campo próprio)",
  "utmParameters": {}
}
```

- **`companyHash` é obrigatório.** Sem ele o endpoint responde 400/500.
- `vehicleBranch`, `vehicleModel` e `clientCity` são **IDs** do Power CRM, não nomes (Fiat = 27, Argo 1.0 = 917, Parnamirim = 3779). Marca e modelo vêm de `powercrmMeta` na cotação; cidade de `utilities.powercrm.com.br/state/stt` e `/city/ct?st=`.
- Só é sucesso quando a resposta traz `"success": true`.
- Cada POST cria uma simulação real no CRM: não testar em produção.

### Tipos de Veículo (`vehicleType`):
- `1`: Carros / Passeio / Utilitários leves
- `2`: Motos
- `3`: Caminhões / Pesados

---

## 3. Endpoints Auxiliares de FIPE & Cidades do PowerCRM

- **Marcas por Tipo:**
  `GET https://app.powercrm.com.br/cb/?type=1`
- **Modelos por Marca e Tipo:**
  `GET https://app.powercrm.com.br/bmy/?cb={brandId}`
- **Anos por Modelo e Marca:**
  `GET https://app.powercrm.com.br/cmby/?cb={brandId}&cy={modelId}`
- **Cidades do RN (Estado 20):**
  `GET https://utilities.powercrm.com.br/city/ct?st=20`
- **Validação de Formulário por Código:**
  `GET https://app.powercrm.com.br/frmByCd?code=4QwWw1QV`

---

## 4. Cálculo de Preço e Planos Oficiais

A 21Go utiliza o motor de cálculo da PowerCRM com base nas faixas da **Tabela FIPE**:
`POST https://21go.site/api/vehicle/powercrm/preco` (ou proxy interno `/api/quote/calculate`).

### Planos Oficiais Mapeados:

1. **Básico:**
   - Roubo e Furto
   - Perda Total por Colisão
   - Assistência 24h em todo o Brasil (Guincho até 400km)
   - Chaveiro, Troca de Pneus, Pane Seca e Elétrica

2. **Do Seu Jeito (Mais Popular):**
   - Todos os benefícios do Básico
   - Cobertura Completa de Colisão (Parcial e Total)
   - Incêndio e Fenômenos da Natureza (Alagamento, Granizo, Queda de Árvore)
   - Proteção de Vidros, Faróis, Lanternas e Retrovisores (opcional)

3. **VIP:**
   - Todos os benefícios do Do Seu Jeito
   - Carro Reserva 7 a 15 dias
   - Proteção contra Terceiros (R$ 30.000 a R$ 50.000)
   - Rastreamento e Monitoramento via App 24h

4. **Premium:**
   - Cobertura Máxima 100% FIPE
   - Carro Reserva até 30 dias
   - Terceiros até R$ 100.000
   - Guincho com km estendida / ilimitada para pane e sinistro

### Regras Comerciais:
- **Desconto Pontualidade:** 5% de desconto automático no boleto pago até o vencimento.
- **Desconto Adesivo 21Go:** 10% a 15% de desconto na mensalidade para associados que usam o adesivo no vidro traseiro.
- **Autonomia do Consultor:** As mensalidades recorrentes seguem a tabela base rateada da 21Go via Hinova SGA (administração central). O consultor tem autonomia sobre a **taxa de adesão/cadastro inicial**.

---

## 5. Requisitos de Documentação & Vistoria Obrigatória

Ao avançar do Pipeline para a fase de ativação e fechamento, o Power CRM e a associação exigem:

1. **Documento de Identificação:** CNH (Carteira Nacional de Habilitação) com foto ou RG caso o associado não possua CNH.
2. **Documento do Veículo:** CRLV (Certificado de Registro e Licenciamento de Veículo) atualizado.
3. **Comprovante de Residência:** Em nome do associado ou parente de 1º grau (água, luz, telefone ou internet).
4. **5 Fotos de Vistoria Digital:**
   - Foto 1: Frente completa (com placa visível)
   - Foto 2: Traseira completa (com placa visível)
   - Foto 3: Lateral direita inteira
   - Foto 4: Lateral esquerda inteira
   - Foto 5: Painel de instrumentos ligado com o odômetro (KM rodado visível)
