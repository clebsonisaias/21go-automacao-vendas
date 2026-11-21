# Manual Técnico de Integração — Hinova Mobile SGA Associado (21GO!)

Documento técnico elaborado a partir da engenharia reversa do APK oficial do aplicativo **21GO! Proteção Veicular** (`br.com.hinovamobile.vinteeumgo` versão `2.22.4.0`, `versionCode 49`).

---

## 1. Visão Geral do Aplicativo
- **Package:** `br.com.hinovamobile.vinteeumgo`
- **Nome Comercial:** 21GO!
- **Versão:** 2.22.4.0 (versionCode 49)
- **Min SDK:** 23 (Android 6.0) | **Target SDK:** 36
- **Base Tecnológica:** Hinova Mobile SGA Associado (plataforma multi-tenant para associações de proteção veicular)
- **Activity de Entrada:** `br.com.hinovamobile.sgaassociado.controllers.SplashActivity`

---

## 2. Infraestrutura de Servidores e URLs Base

| Finalidade | URL Base |
| :--- | :--- |
| **API Principal SGA Associado** | `https://api.appassociado.com.br/ApiAssociadoV22/api/` |
| **Push Notifications (PushServer)** | `https://push.hinovamobile.com.br/PushServer/api/` |
| **Painel App Connect** | `https://app.hinovamobile.com.br/appconnect/` |
| **Pagamento de Débitos e Multas (Zapay)** | `https://hinova.usezapay.com.br/` |
| **Consulta de Endereço** | `https://viacep.com.br/ws/{cep}/json/` |

---

## 3. Modelo de Autenticação e Segurança (Duas Camadas)

### Camada 1: Tenant (Identificação da Franquia/Associação)
- **Parâmetros:**
  - `CodigoAssociacao`: Código numérico único da associação no banco de dados Hinova.
  - `CodigoSeguranca`: Chave de segurança associada à conta (usada também em URLs como `PoliticaPrivacidade/Index?codigoSeguranca=...`).
- **Comportamento no APK:** Os valores não vêm em texto puro no manifesto ou strings públicas; são carregados dinamicamente via bootstrap/App Connect ou persistidos em `SharedPreferences` pós-instalação.

### Camada 2: Usuário (Associado)
- **Credenciais:** CPF (limpo, apenas números) + Senha do associado.
- **Header retornado:** `Authorization: Bearer <TOKEN_JWT>`
- O token gerado dá acesso a todos os endpoints do associado autenticado (dados pessoais, veículos, histórico e solicitação de socorro).

---

## 4. Catálogo Completo de Endpoints

### 4.1 Autenticação e Conta
* `POST Login/autenticarAssociadoSga`: Login via CPF e Senha, devolvendo `Bearer token` e dados do associado.
* `POST Login/GerarCodigoAcesso`: Envio de token SMS/WhatsApp para primeiro acesso.
* `POST Login/ValidarCodigoAcesso`: Validação do código de ativação.
* `POST Login/redefinirSenhaAssociadoSga`: Recuperação e troca de senha do associado.

### 4.2 Dados do Associado e Documentação
* `GET/POST Associado/ConsultarDadosAssociado`: Retorna dados cadastrais, e-mail, telefone, endereço e lista de veículos ativos.
* `POST Associado/AlterarDadosAssociadoSGA`: Atualização cadastral.
* `POST Associado/AlterarSenhaAssociadoSga`: Alteração de senha da área logada.
* `POST Associado/GravarAvatarAssociadoSga`: Upload de foto de perfil.
* `GET Associado/ConsultarListaDeDocumentosAssociado`: Lista boletos, contratos e regulamentos.

### 4.3 Assistência 24h e Guincho (Módulos WebAssist, AID, MCK e Veniti)
* `POST Assistencia/GravarSessaoWebAssist`: Inicia o chamado de assistência para o módulo WebAssist.
* `POST Assistencia/GravarConsumoWebAssist`: Grava o consumo da cota de guincho/socorro do veículo.
* `POST Assistencia/GravarSessaoAid`: Acionamento via módulo AID.
* `POST Assistencia/GravarSessaoMck`: Acionamento via módulo MCK.
* `POST Assistencia/GravarSessaoVeniti`: Acionamento via módulo Veniti.
* `POST Assistencia/GravarSessaoAssistenciaPadrao`: Chamado genérico da assistência.
* `GET/POST Assistencia/GravarHistoricoAssistencia`: Registra e consulta o histórico de socorros.

### 4.4 Oficinas Credenciadas
* `GET/POST Oficina/consultarOficinasAssociacao`: Lista de oficinas mecânicas e funilarias parceiras.
* `GET/POST Oficina/ConsultarOficinasDestaqueAssociacao`: Oficinas recomendadas em destaque.
* `POST Oficina/avaliarOficinaAssociacao`: Avaliação da oficina pelo associado após serviço.

### 4.5 Sinistros e Eventos
* `POST Evento/CadastrarEvento`: Registro de aviso de sinistro (colisão, roubo, furto, terceiros).
* `GET Evento/ListarEventosVeiculo`: Acompanhamento de sinistros abertos por veículo.
* `GET Evento/VerificaAberturaEvento`: Checagem de elegibilidade para abertura de evento.
* `POST Evento/CadastrarDocumento`: Envio de B.O. (Boletim de Ocorrência), CNH e fotos do veículo.

### 4.6 Rastreamento e Telemetria
* `POST Rastreamento/AutenticarRastreamento`
* `GET Rastreamento/ConsultarDadosVeiculoRastreamento`
* `GET Rastreamento/ConsultarTrajetoVeiculoRastreamento`
* `POST Rastreamento/ExecutarComandoRastreamento` (bloqueio/desbloqueio quando contratado)
* Provedores suportados identificados no APK: Getrak, Binsat, Softruck, Suntech, Power, Mundo7, Iter.

---

## 5. Como Obter o `CodigoAssociacao` Real da 21GO!

Para ativar a chamada direta aos servidores da Hinova:
1. **Opção A (Recomendada):** Solicitar à diretoria ou suporte do SGA/Hinova o `CodigoAssociacao` e `CodigoSeguranca` da franquia 21GO!.
2. **Opção B (Interceptação de Tráfego):**
   - Instalar o aplicativo oficial 21GO! em um dispositivo Android de testes.
   - Configurar o proxy **mitmproxy** ou **Charles Proxy** no Wi-Fi do aparelho com o certificado CA instalado.
   - Realizar o login com um associado real.
   - Inspecionar a requisição inicial para `api.appassociado.com.br` e copiar o `CodigoAssociacao` do payload/header.
3. **Configuração no Servidor:**
   Basta definir no arquivo de ambiente (`.env` ou Coolify):
   ```bash
   HINOVA_CODIGO_ASSOCIACAO=XXXX
   HINOVA_CODIGO_SEGURANCA=YYYY
   ```

---

## 6. Arquitetura Híbrida em Produção (Failover CRM)
Como o lançamento oficial é imediato, o projeto implementou uma arquitetura resiliente:
* Se `HINOVA_CODIGO_ASSOCIACAO` não estiver preenchido, as rotas `/api/cliente/login`, `/api/cliente/dados` e `/api/cliente/assistencia` consultam e gravam diretamente na base de associados do **CRM 21Go (`https://www.crm21go.site/api`)**.
* O associado consegue logar, visualizar seus dados e solicitar assistência 24h sem nenhuma falha de tela ou indisponibilidade técnica.
