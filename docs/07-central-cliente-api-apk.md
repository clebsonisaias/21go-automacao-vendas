# Central do Cliente 21Go — Integração com a API Hinova Mobile (SGA Associado)

Este documento detalha a arquitetura, endpoints, variáveis de ambiente e diretrizes de integração da **Central do Cliente (Portal do Associado)** da 21Go Proteção Veicular, desenvolvida com base na engenharia reversa do APK oficial `br.com.hinovamobile.vinteeumgo` (versão `2.22.4.0`).

---

## 1. Origem e Contexto Técnico do APK

* **Pacote do Aplicativo:** `br.com.hinovamobile.vinteeumgo`
* **Versão Analisada:** `2.22.4.0`
* **Fornecedor da Solução:** Hinova Mobile / Hinova SGA (Sistema de Gestão de Associações)
* **Base URL Identificada:**
  ```text
  https://api.appassociado.com.br/ApiAssociadoV22/api/
  ```

### Arquitetura Multi-Tenant
A API do Hinova Mobile é multi-tenant e atende diversas associações do ecossistema SGA. Por esse motivo, a segregação de dados é realizada principalmente através de:
1. **`CodigoAssociacao`** (parâmetro obrigatório no cabeçalho HTTP ou no corpo das requisições).
2. **`CodigoSeguranca`** (token ou chave de aplicação opcional em alguns métodos).
3. **`Bearer Token`** (JWT retornado após o login do associado via CPF + senha).

---

## 2. Endpoints Mapeados no APK

| Módulo | Endpoint no SGA Hinova | Método HTTP | Finalidade |
| :--- | :--- | :--- | :--- |
| **Autenticação** | `Login/autenticarAssociadoSga` | `POST` | Login principal do associado com CPF e Senha |
| **Autenticação** | `Login/GerarCodigoAcesso` | `POST` | Envio de código OTP via SMS/E-mail para primeiro acesso |
| **Autenticação** | `Login/ValidarCodigoAcesso` | `POST` | Validação do token temporário de redefinição de senha |
| **Associado** | `Associado/ConsultarDadosAssociado` | `POST` / `GET` | Recuperação do cadastro, endereço e veículos ativos |
| **Associado** | `Associado/AlterarSenhaAssociadoSga`| `POST` | Atualização da credencial de acesso do associado |
| **Associado** | `Associado/AlterarDadosAssociadoSGA`| `POST` | Atualização de telefone, e-mail e endereço |
| **Assistência 24h** | `Assistencia/GravarHistoricoAssistencia` | `POST` | Abertura de chamado de guincho, pane ou socorro |
| **Assistência 24h** | `Assistencia/GravarSessaoWebAssist` | `POST` | Início de sessão para rastreamento de prestador de socorro |
| **Assistência 24h** | `Assistencia/GravarConsumoWebAssist`| `POST` | Registro de KM ou consumo de cota do associado |
| **Eventos/Sinistros** | `Evento/ListarEventosVeiculo` | `POST` | Consulta de histórico de sinistros e acionamentos |
| **Oficinas** | `Oficina/consultarOficinasAssociacao`| `POST` | Listagem da rede credenciada de oficinas e funilarias |
| **Oficinas** | `Oficina/ConsultarOficinasDestaqueAssociacao` | `POST` | Oficinas em destaque com parceria prioritária |

---

## 3. Variáveis de Ambiente Necessárias

Para operar com a API real em produção, configure as variáveis abaixo no arquivo `.env` e no painel do servidor (Coolify):

```env
# URL Base da API Hinova SGA
HINOVA_API_BASE_URL=https://api.appassociado.com.br/ApiAssociadoV22/api/

# Código da Franquia/Associação 21Go no SGA (a ser extraído via proxy/interceptação)
HINOVA_CODIGO_ASSOCIACAO=

# Chave de segurança opcional de aplicação
HINOVA_CODIGO_SEGURANCA=
```

---

## 4. Estrutura do Código Implementado

A arquitetura no projeto Next.js (App Router) está organizada em três camadas:

1. **Camada de Cliente de Integração (`src/lib/hinova-api.ts`)**:
   * Classe singleton `HinovaApiClient` / `hinovaApi`.
   * Trata cabeçalhos, formatação de CPF/placa, timeouts e erros HTTP.
   * **Modo de Resiliência / Mock Fallback:** Se a API externa estiver sem conexão ou sem o `CodigoAssociacao` validado, o cliente retorna dados estruturados de demonstração, permitindo que o frontend continue 100% testável sem quebrar a aplicação.

2. **Rotas de API Internas (Route Handlers)**:
   * `POST /api/cliente/login`: Valida CPF, aciona o SGA e retorna sessão.
   * `GET /api/cliente/dados`: Consulta dados do associado e veículos cadastrados.
   * `POST /api/cliente/assistencia`: Recebe a solicitação de socorro 24h (guincho, pane, estepe) e devolve o protocolo oficial.
   * `GET /api/cliente/oficinas`: Entrega oficinas credenciadas com filtro de busca.
   * `GET /api/cliente/historico`: Lista histórico de ocorrências.

3. **Área do Cliente (Frontend)**:
   * `/cliente`: Tela de autenticação com validação de CPF, atalho demo e design 21Go.
   * `/cliente/dashboard`: Painel principal com dados do veículo, status ativo, matrícula e atalhos rápidos.
   * `/cliente/assistencia`: Formulário interativo com geolocalização GPS, seleção do tipo de pane e confirmação com protocolo.
   * `/cliente/oficinas`: Busca e contato de oficinas homologadas.
   * `/cliente/historico`: Linha do tempo dos chamados atendidos.

---

## 5. Próximos Passos para Confirmação do Tráfego Real (MITM Proxy)

Como a análise inicial foi puramente estática a partir da descompilação do APK, recomenda-se realizar uma interceptação de tráfego HTTPS para confirmar o `CodigoAssociacao` definitivo e eventuais campos extras do JSON:

### Como Interceptar o Tráfego do App:
1. Instale o APK oficial em um emulador Android (Android Studio com imagem sem Play Store / Google APIs) ou em um aparelho físico com root.
2. Configure uma ferramenta de inspeção como **HTTP Toolkit**, **Charles Proxy** ou **mitmproxy**.
3. Instale o certificado raiz de autoridade certificadora (CA) do proxy no armazenamento do sistema Android.
4. Caso o APK utilize *SSL Certificate Pinning*, utilize o módulo Frida ou APKLab para desabilitar a checagem:
   ```bash
   frida --codeshare pcipolloni/universal-android-ssl-pinning-bypass-with-frida -f br.com.hinovamobile.vinteeumgo
   ```
5. Abra o aplicativo, realize uma tentativa de login e anote:
   * O valor do cabeçalho `CodigoAssociacao` ou campo no payload JSON.
   * O schema exato do token retornado (se `Token`, `token` ou `access_token`).
6. Atualize a variável `HINOVA_CODIGO_ASSOCIACAO` no servidor para conexão direta de produção.
