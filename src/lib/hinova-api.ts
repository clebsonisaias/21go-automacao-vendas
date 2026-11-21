/**
 * Cliente de Integração com a API Hinova Mobile (SGA Associado)
 * Baseado na engenharia reversa do APK: br.com.hinovamobile.vinteeumgo (v2.22.4.0)
 * 
 * Base URL: https://api.appassociado.com.br/ApiAssociadoV22/api/
 * 
 * NOTA DE IMPLEMENTAÇÃO:
 * Os endpoints foram identificados estaticamente no binário do aplicativo.
 * A API do Hinova SGA é multi-tenant e requer o cabeçalho ou parâmetro `CodigoAssociacao`.
 * Caso a API externa esteja inacessível ou o CodigoAssociacao ainda não tenha sido
 * confirmado via interceptação de tráfego, o cliente opera com fallback gracioso (mock)
 * para garantir que o portal continue testável e funcional.
 */

export interface HinovaVeiculo {
  codigoVeiculo: string | number
  placa: string
  marca: string
  modelo: string
  anoModelo: number
  anoFabricacao?: number
  chassi?: string
  cor?: string
  status: 'Ativo' | 'Pendente' | 'Inativo'
  numeroContrato?: string
  categoria?: string
}

export interface HinovaAssociadoDados {
  codigoAssociado: string | number
  nome: string
  cpf: string
  email: string
  telefone: string
  cidade?: string
  uf?: string
  situacao: 'Ativo' | 'Pendente' | 'Bloqueado'
  veiculos: HinovaVeiculo[]
  dataFiliacao?: string
}

export interface HinovaAuthResult {
  success: boolean
  token?: string
  associado?: HinovaAssociadoDados
  error?: string
  message?: string
  isMock?: boolean
}

export interface HinovaAssistenciaRequest {
  tipoServico: 'guincho' | 'pane_seca' | 'chaveiro' | 'troca_pneu' | 'bateria' | 'colisao' | 'outro'
  placa: string
  telefoneContato: string
  enderecoOrigem: string
  enderecoDestino?: string
  descricao: string
  latitude?: number
  longitude?: number
}

export interface HinovaAssistenciaResult {
  success: boolean
  protocolo?: string
  mensagem?: string
  error?: string
  isMock?: boolean
}

export interface HinovaOficina {
  id: string | number
  nome: string
  endereco: string
  bairro: string
  cidade: string
  uf: string
  telefone: string
  destaque: boolean
  especialidade: string
}

export interface HinovaEvento {
  id: string | number
  protocolo: string
  tipo: string
  placa: string
  data: string
  status: 'Em Análise' | 'Em Andamento' | 'Concluído' | 'Cancelado'
  descricao: string
}

export class HinovaApiClient {
  private baseUrl: string
  private codigoAssociacao: string
  private codigoSeguranca?: string

  constructor(baseUrl?: string, codigoAssociacao?: string, codigoSeguranca?: string) {
    this.baseUrl = (baseUrl || process.env.HINOVA_API_BASE_URL || 'https://api.appassociado.com.br/ApiAssociadoV22/api/').replace(/\/+$/, '')
    this.codigoAssociacao = codigoAssociacao || process.env.HINOVA_CODIGO_ASSOCIACAO || ''
    this.codigoSeguranca = codigoSeguranca || process.env.HINOVA_CODIGO_SEGURANCA || ''
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': '21GoMobile/2.22.4.0 (Android; HinovaSGA)',
    }

    if (this.codigoAssociacao) {
      headers['CodigoAssociacao'] = this.codigoAssociacao
      headers['X-Codigo-Associacao'] = this.codigoAssociacao
    }

    if (this.codigoSeguranca) {
      headers['CodigoSeguranca'] = this.codigoSeguranca
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Autentica o associado no SGA Hinova via CPF + Senha
   * Endpoint APK: POST Login/autenticarAssociadoSga
   */
  async autenticar(cpfRaw: string, senha: string): Promise<HinovaAuthResult> {
    const cpf = cpfRaw.replace(/\D/g, '')

    // Se estiver sem credenciais ou conexão, permite login com usuário demo para desenvolvimento
    if (process.env.NODE_ENV !== 'production' && process.env.HINOVA_DEMO_LOGIN === 'true' && senha === 'demo123') {
      return this.mockAuthResult(cpf, 'Associado Demonstração 21Go')
    }

    try {
      const url = `${this.baseUrl}/Login/autenticarAssociadoSga`
      const payload = {
        Cpf: cpf,
        Senha: senha,
        CodigoAssociacao: this.codigoAssociacao || undefined,
        CodigoSeguranca: this.codigoSeguranca || undefined,
        Plataforma: 'Android',
        VersaoApp: '2.22.4.0',
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        const token = data.Token || data.token || data.access_token || data.BearerToken

        // Se a API retornou sucesso e dados
        if (token || data.Sucesso || data.sucesso) {
          return {
            success: true,
            token: token || `hinova_sess_${Date.now()}`,
            associado: this.parseAssociadoDados(data),
          }
        }

        return {
          success: false,
          error: data.Mensagem || data.mensagem || 'Credenciais inválidas no sistema Hinova SGA.',
        }
      }

      // Se a API retornar erro HTTP (ex: 401, 404, 500)
      const errBody = await res.text().catch(() => '')
      console.warn(`[Hinova API] HTTP ${res.status} em autenticarAssociadoSga:`, errBody)

      // Fallback amigável se o servidor Hinova recusar por falta do CodigoAssociacao oficial ainda não validado
      // Só em desenvolvimento e com HINOVA_DEMO_LOGIN=true. Em produção, falha fechada.
      if (this.demoLoginAllowed() && (res.status === 404 || res.status === 400 || res.status === 502 || !this.codigoAssociacao)) {
        console.info('[Hinova API] Ativando fallback de desenvolvimento para demonstrar o portal.')
        return this.mockAuthResult(cpf, 'Associado 21Go')
      }

      return {
        success: false,
        error: `Falha na autenticação (HTTP ${res.status}). Verifique seu CPF e senha.`,
      }
    } catch (err: unknown) {
      console.error('[Hinova API] Exceção na autenticação:', err)
      if (this.demoLoginAllowed()) {
        return this.mockAuthResult(cpf, 'Associado 21Go (Modo Offline)')
      }
      return { success: false, error: 'Serviço de autenticação indisponível no momento. Tente novamente.' }
    }
  }

  /**
   * Consulta os dados cadastrais e veículos do associado
   * Endpoint APK: POST/GET Associado/ConsultarDadosAssociado
   */
  async consultarDados(token: string, cpf?: string): Promise<HinovaAssociadoDados> {
    try {
      const url = `${this.baseUrl}/Associado/ConsultarDadosAssociado`
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          CodigoAssociacao: this.codigoAssociacao,
          Cpf: cpf ? cpf.replace(/\D/g, '') : undefined,
        }),
        signal: AbortSignal.timeout(6000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data && (data.Nome || data.nome || data.Associado)) {
          return this.parseAssociadoDados(data)
        }
      }
    } catch (err) {
      console.warn('[Hinova API] Não foi possível consultar dados na API real, usando fallback:', err)
    }

    if (!this.demoLoginAllowed()) {
      throw new Error('Não foi possível consultar seus dados agora. Tente novamente em instantes.')
    }
    return this.mockAssociadoDados(cpf || '12345678900')
  }

  /**
   * Registra pedido de assistência 24 horas no SGA
   * Endpoints APK:
   * - Assistencia/GravarSessaoWebAssist
   * - Assistencia/GravarConsumoWebAssist
   * - Assistencia/GravarHistoricoAssistencia
   */
  async solicitarAssistencia(
    token: string,
    req: HinovaAssistenciaRequest
  ): Promise<HinovaAssistenciaResult> {
    const protocoloGerado = `21GO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

    try {
      const url = `${this.baseUrl}/Assistencia/GravarHistoricoAssistencia`
      const payload = {
        CodigoAssociacao: this.codigoAssociacao,
        Placa: req.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        TipoServico: req.tipoServico,
        Telefone: req.telefoneContato,
        EnderecoOrigem: req.enderecoOrigem,
        EnderecoDestino: req.enderecoDestino || '',
        Observacao: req.descricao,
        Latitude: req.latitude || 0,
        Longitude: req.longitude || 0,
        DataSolicitacao: new Date().toISOString(),
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        return {
          success: true,
          protocolo: data.Protocolo || data.protocolo || protocoloGerado,
          mensagem: data.Mensagem || 'Solicitação de assistência registrada com sucesso! A base operacional foi acionada.',
        }
      }
    } catch (err) {
      console.warn('[Hinova API] Falha de rede ao registrar assistência na Hinova:', err)
    }

    // Nunca diga ao cliente que a equipe foi acionada se a chamada ao SGA falhou.
    if (!this.demoLoginAllowed()) {
      return {
        success: false,
        error:
          'Não conseguimos registrar o pedido de assistência agora. Ligue para a central 24h ou chame no WhatsApp para atendimento imediato.',
        mensagem:
          'Não conseguimos registrar o pedido de assistência agora. Ligue para a central 24h ou chame no WhatsApp para atendimento imediato.',
      } as HinovaAssistenciaResult
    }

    // Fallback de desenvolvimento (HINOVA_DEMO_LOGIN=true)
    return {
      success: true,
      protocolo: protocoloGerado,
      mensagem: 'Sua solicitação de assistência foi registrada com sucesso! Nossa equipe 24h já recebeu o alerta.',
      isMock: true,
    }
  }

  /**
   * Consulta rede de oficinas credenciadas
   * Endpoints APK:
   * - Oficina/consultarOficinasAssociacao
   * - Oficina/ConsultarOficinasDestaqueAssociacao
   */
  async listarOficinas(token?: string, cidade?: string): Promise<HinovaOficina[]> {
    try {
      const url = `${this.baseUrl}/Oficina/consultarOficinasAssociacao`
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          CodigoAssociacao: this.codigoAssociacao,
          Cidade: cidade || undefined,
        }),
        signal: AbortSignal.timeout(6000),
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          return data.map((o: Record<string, unknown>, idx: number) => ({
            id: (o.CodigoOficina || o.Id || idx + 1) as string | number,
            nome: String(o.NomeOficina || o.Nome || 'Oficina Credenciada'),
            endereco: String(o.Endereco || 'Endereço sob consulta'),
            bairro: String(o.Bairro || 'Centro'),
            cidade: String(o.Cidade || 'Natal'),
            uf: String(o.Uf || 'RN'),
            telefone: String(o.Telefone || '(84) 2018-2178'),
            destaque: Boolean(o.Destaque),
            especialidade: String(o.Especialidade || 'Funilaria, Pintura e Mecânica'),
          }))
        }
      }
    } catch {}

    if (!this.demoLoginAllowed()) return []
    return this.mockOficinas()
  }

  /**
   * Consulta histórico de eventos e sinistros do veículo
   * Endpoint APK: Evento/ListarEventosVeiculo
   */
  async listarEventos(token?: string, placa?: string): Promise<HinovaEvento[]> {
    try {
      const url = `${this.baseUrl}/Evento/ListarEventosVeiculo`
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          CodigoAssociacao: this.codigoAssociacao,
          Placa: placa,
        }),
        signal: AbortSignal.timeout(6000),
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          return data.map((e: Record<string, unknown>, idx: number) => ({
            id: (e.CodigoEvento || idx + 1) as string | number,
            protocolo: String(e.Protocolo || `EV-${idx + 100}`),
            tipo: String(e.TipoEvento || 'Assistência 24h'),
            placa: String(e.Placa || placa || 'ABC-1234'),
            data: String(e.Data || new Date().toLocaleDateString('pt-BR')),
            status: (e.Status || 'Concluído') as HinovaEvento['status'],
            descricao: String(e.Descricao || 'Atendimento registrado no SGA'),
          }))
        }
      }
    } catch {}

    if (!this.demoLoginAllowed()) return []
    return this.mockEventos(placa)
  }

  // ==========================================
  // HELPERS & MOCKS PARA RESILIÊNCIA E TESTES
  // ==========================================

  private parseAssociadoDados(data: Record<string, unknown>): HinovaAssociadoDados {
    const rawVeiculos = Array.isArray(data.Veiculos) ? data.Veiculos : []
    const veiculos: HinovaVeiculo[] = rawVeiculos.map((v: Record<string, unknown>, i: number) => ({
      codigoVeiculo: (v.CodigoVeiculo || i + 1) as string | number,
      placa: String(v.Placa || 'BRA2E19'),
      marca: String(v.Marca || 'Toyota'),
      modelo: String(v.Modelo || 'Corolla'),
      anoModelo: Number(v.AnoModelo) || 2023,
      anoFabricacao: Number(v.AnoFabricacao) || 2022,
      cor: String(v.Cor || 'Prata'),
      chassi: String(v.Chassi || '9BWAA05U8BP000000'),
      status: (v.Status || 'Ativo') as 'Ativo',
      numeroContrato: String(v.NumeroContrato || '21G-84920'),
    }))

    return {
      codigoAssociado: (data.CodigoAssociado || 1) as string | number,
      nome: String(data.Nome || 'Associado 21Go'),
      cpf: String(data.Cpf || ''),
      email: String(data.Email || 'associado@21go.seg.br'),
      telefone: String(data.Telefone || '(84) 99999-9999'),
      cidade: String(data.Cidade || 'Natal'),
      uf: String(data.Uf || 'RN'),
      situacao: 'Ativo',
      veiculos: veiculos.length > 0 ? veiculos : this.mockVeiculos(),
      dataFiliacao: String(data.DataFiliacao || '10/01/2024'),
    }
  }

  /** Login de demonstração: nunca em produção e só com flag explícita. */
  private demoLoginAllowed(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.HINOVA_DEMO_LOGIN === 'true'
  }

  private mockAuthResult(cpf: string, nomePadrao: string): HinovaAuthResult {
    const mockData = this.mockAssociadoDados(cpf, nomePadrao)
    return {
      success: true,
      token: `hinova_jwt_demo_${Date.now()}`,
      associado: mockData,
      isMock: true,
      message: 'Autenticado com sucesso na Central do Cliente 21Go.',
    }
  }

  private mockAssociadoDados(cpf: string, nome = 'Christian Araujo P. Lucena'): HinovaAssociadoDados {
    return {
      codigoAssociado: '21084',
      nome,
      cpf: cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '084.123.456-78',
      email: 'associado@21go.seg.br',
      telefone: '(84) 98821-2178',
      cidade: 'Natal',
      uf: 'RN',
      situacao: 'Ativo',
      dataFiliacao: '15/02/2024',
      veiculos: this.mockVeiculos(),
    }
  }

  private mockVeiculos(): HinovaVeiculo[] {
    return [
      {
        codigoVeiculo: '101',
        placa: 'RGL9B19',
        marca: 'Volkswagen',
        modelo: 'Gol 1.0 Flex 12V 5p',
        anoModelo: 2023,
        anoFabricacao: 2022,
        cor: 'Branca',
        chassi: '9BWAA05U8BP012345',
        status: 'Ativo',
        numeroContrato: '21GO-88419',
        categoria: 'Automóvel Particular',
      },
    ]
  }

  private mockOficinas(): HinovaOficina[] {
    return [
      {
        id: 1,
        nome: 'Auto Center Express Natal (Credenciada 21Go)',
        endereco: 'Av. Prudente de Morais, 3420',
        bairro: 'Lagoa Nova',
        cidade: 'Natal',
        uf: 'RN',
        telefone: '(84) 3206-1122',
        destaque: true,
        especialidade: 'Mecânica Geral, Alinhamento e Suspensão',
      },
      {
        id: 2,
        nome: 'Centro de Reparos e Pintura CITmax',
        endereco: 'Rua Jaguarari, 1850',
        bairro: 'Candelária',
        cidade: 'Natal',
        uf: 'RN',
        telefone: '(84) 2018-2178',
        destaque: true,
        especialidade: 'Funilaria Express, Martelinho de Ouro e Pintura',
      },
      {
        id: 3,
        nome: 'Oficina Parnamirim Auto Prime',
        endereco: 'Av. Brigadeiro Everaldo Breves, 520',
        bairro: 'Centro',
        cidade: 'Parnamirim',
        uf: 'RN',
        telefone: '(84) 3272-4090',
        destaque: false,
        especialidade: 'Auto Elétrica, Baterias e Injeção Eletrônica',
      },
      {
        id: 4,
        nome: 'SOS Parabrisas e Vidros 21Go',
        endereco: 'Av. Bernardo Vieira, 2100',
        bairro: 'Dix-Sept Rosado',
        cidade: 'Natal',
        uf: 'RN',
        telefone: '(84) 3654-8899',
        destaque: true,
        especialidade: 'Troca e Reparo de Vidros, Faróis e Retrovisores',
      },
    ]
  }

  private mockEventos(placa = 'RGL9B19'): HinovaEvento[] {
    return [
      {
        id: 1,
        protocolo: '21GO-2026-84910',
        tipo: 'Assistência 24h • Guincho / Reboque',
        placa,
        data: '14/01/2026 10:35',
        status: 'Concluído',
        descricao: 'Pane elétrica com remoção para auto center credenciado em Natal/RN.',
      },
      {
        id: 2,
        protocolo: '21GO-2025-41203',
        tipo: 'Assistência 24h • Troca de Pneu',
        placa,
        data: '18/11/2025 21:10',
        status: 'Concluído',
        descricao: 'Auxílio na troca de estepe na BR-101.',
      },
    ]
  }
}

// Instância singleton para uso em rotas do Next.js
export const hinovaApi = new HinovaApiClient()
