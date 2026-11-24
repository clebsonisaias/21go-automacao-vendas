import type { PrecoNordeste } from './tabela-nordeste'

export type VehicleType = 'carro' | 'moto'

/** Valores do plano no CRM (preço nacional): guardados para voltar a eles se o comprovante mudar a região. */
export interface PlanoNacional {
  monthly: number
  pontualidade: number
  adesivo: number
  ativacao: number
}

/** Plano com o preço da Tabela Nordeste, para quem mora onde ela vale (ver preco-regional.ts). */
export interface PlanoRegional {
  uf: string
  tabela: PrecoNordeste
  nacional: PlanoNacional
}

export interface VehicleInfo {
  marca: string
  modelo: string
  ano: string
  fipeValue: number
  fipeCode: string
  categoria?: string
  combustivel?: string
  placa?: string
}

export interface PlanPricing {
  id: string
  name: string
  monthly: number
  popular?: boolean
  ativacao: number
  mensalidadeComPontualidade: number // 5% off
  mensalidadeComAdesivo: number // 10% ou 15% off + pontualidade
  coberturas: string[]
  /** Mensalidade do mesmo plano no CRM, quando este plano tem o preço da Tabela Nordeste. */
  precoNacional?: number
  regional?: PlanoRegional
}

export interface QuoteCalculationResult {
  success: boolean
  vehicle: VehicleInfo
  plans: PlanPricing[]
  powercrmMeta?: {
    brandId: number | string
    modelId: number | string
    yearId: number | string
  }
  regras: {
    exigeVistoriaPresencial: boolean
    elegivelAdesivo: boolean
    percentualAdesivo: number
    percentualPontualidade: number
  }
  /** Estado informado na cotação; `regional` = a tabela vale lá; `tabela` = o VIP veio com o preço da tabela (os outros planos, com o do CRM). */
  regiao?: { uf: string; regional: boolean; tabela: boolean }
  /** Assinado pelo servidor; reenviado no cadastro para o servidor fixar os valores cobrados. */
  quoteToken?: string
  error?: string
}

/** Cupom de desconto aplicado na adesão (ver src/lib/cupons.ts). */
export interface CupomAplicado {
  codigo: string
  tipo: 'valor' | 'percentual'
  desconto: number
  valorDesconto: number
  aplicadoEm: string
  origem: 'cadastro' | 'documentos' | 'chat'
}

export interface LeadSubmissionPayload {
  nome: string
  cpf?: string
  whatsapp: string
  email?: string
  cidade?: string
  estado?: string
  veiculoTrabalho?: boolean
  placa?: string
  planoEscolhidoId: string
  planoEscolhidoNome: string
  mensalidadeOriginal: number
  mensalidadeFinal: number
  ativacao: number
  /** Adesão antes do cupom (só quando há cupom). */
  ativacaoOriginal?: number
  cupom?: CupomAplicado
  comAdesivo: boolean
  vehicle: VehicleInfo
  quoteToken?: string
  powercrmMeta?: {
    brandId: number | string
    modelId: number | string
    yearId: number | string
  }
  /** Daqui para baixo, só o servidor preenche (em `aplicarCotacao`, a partir do token). */
  ufDeclarada?: string
  precoRegiao?: 'regional' | 'nacional'
  tabelaNordeste?: PrecoNordeste
  planoNacional?: PlanoNacional
  /** Plano que a tabela substitui nesta cotação (o comprovante só troca o preço sozinho nele). */
  planoBaseId?: string
}

export type ExtractedDocType = 'cnh' | 'crlv' | 'comprovante_residencia' | 'desconhecido'

export interface ExtractedPersonalInfo {
  nome?: string
  cpf?: string
  rg?: string
  orgaoExpedidor?: string
  dataNascimento?: string
  numeroCnh?: string
  categoriaCnh?: string
  validadeCnh?: string
  primeiraHabilitacao?: string
}

export interface ExtractedVehicleInfo {
  placa?: string
  chassi?: string
  renavam?: string
  marcaModelo?: string
  marca?: string
  modelo?: string
  anoFabricacao?: number | string
  anoModelo?: number | string
  cor?: string
  combustivel?: string
  nomeProprietario?: string
  cpfCnpjProprietario?: string
}

export interface ExtractedAddressInfo {
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
}

export interface DocumentAiResult {
  success: boolean
  documentType: ExtractedDocType
  confidence: number
  personal?: ExtractedPersonalInfo
  vehicle?: ExtractedVehicleInfo
  address?: ExtractedAddressInfo
  rawText?: string
  model?: string
  latencyMs?: number
  error?: string
}

