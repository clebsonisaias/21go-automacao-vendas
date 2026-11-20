export type VehicleType = 'carro' | 'moto'

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
  error?: string
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
  comAdesivo: boolean
  vehicle: VehicleInfo
  powercrmMeta?: {
    brandId: number | string
    modelId: number | string
    yearId: number | string
  }
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
  error?: string
}

