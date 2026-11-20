import { VehicleType, VehicleInfo, QuoteCalculationResult } from './types'
import { enrichPlansWithRules } from './pricing'

const BASE_URL = process.env.QUOTE_API_BASE_URL || 'https://21go.site/api'

export interface PlateIdentifyResponse {
  status: 'found' | 'partial' | 'notfound'
  tipo?: VehicleType
  brandId?: string | number
  brandText?: string
  year?: string
  modelId?: string | number
  modelText?: string
  codFipe?: string
  label?: string
  cor?: string
  candidates?: Array<{
    code: string | number
    name: string
    codFipe: string
  }>
}

/**
 * Consulta o veículo a partir da placa
 */
export async function identifyPlate(plate: string): Promise<PlateIdentifyResponse> {
  const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleanPlate.length < 7) {
    throw new Error('Placa inválida. Forneça 7 caracteres.')
  }

  const res = await fetch(`${BASE_URL}/vehicle/plate-identify/${cleanPlate}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (21Go Franquia Client)',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Falha ao consultar placa: ${res.statusText}`)
  }

  return (await res.json()) as PlateIdentifyResponse
}

/**
 * Busca a lista de marcas por tipo (carro ou moto)
 */
export async function getBrands(tipo: VehicleType = 'carro') {
  const res = await fetch(`${BASE_URL}/vehicle/powercrm/marcas?tipo=${tipo}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 }, // Cache de 24h
  })
  if (!res.ok) throw new Error('Falha ao listar marcas')
  return (await res.json()) as { success: boolean; data: Array<{ code: string; name: string }> }
}

/**
 * Busca a lista de anos disponíveis
 */
export async function getYears() {
  const res = await fetch(`${BASE_URL}/vehicle/powercrm/anos`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error('Falha ao listar anos')
  return (await res.json()) as { success: boolean; data: Array<{ code: string; name: string }> }
}

/**
 * Busca modelos por marca e ano
 */
export async function getModels(brandId: string | number, year: string) {
  const res = await fetch(
    `${BASE_URL}/vehicle/powercrm/modelos?marca=${brandId}&ano=${year}`,
    {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    }
  )
  if (!res.ok) throw new Error('Falha ao listar modelos')
  return (await res.json()) as {
    success: boolean
    data: Array<{ code: string; name: string; codFipe: string }>
  }
}

/**
 * Consulta a precificação oficial e valor FIPE na API da 21Go
 */
export async function fetchOfficialPricing(params: {
  tipo: VehicleType
  brandId: string | number
  brandText: string
  modelId: string | number
  modelText: string
  year: string
  codFipe: string
  leilao?: 'nao' | 'leilao' | 'remarcado'
  carroApp?: 'nao' | 'sim'
}): Promise<QuoteCalculationResult> {
  const res = await fetch(`${BASE_URL}/vehicle/powercrm/preco`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      tipo: params.tipo,
      brandId: String(params.brandId),
      brandText: params.brandText,
      modelId: String(params.modelId),
      modelText: params.modelText,
      year: String(params.year),
      codFipe: params.codFipe,
      leilao: params.leilao || 'nao',
      carroApp: params.carroApp || 'nao',
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Erro na cotação: ${res.statusText}`)
  }

  const data = await res.json()
  if (!data.success || !data.plans || !data.plans.length) {
    return {
      success: false,
      vehicle: {
        marca: params.brandText,
        modelo: params.modelText,
        ano: params.year,
        fipeValue: data.vehicle?.fipeValue || 0,
        fipeCode: params.codFipe,
      },
      plans: [],
      regras: {
        exigeVistoriaPresencial: false,
        elegivelAdesivo: false,
        percentualAdesivo: 0,
        percentualPontualidade: 5,
      },
      error: data.reason || 'Veículo indisponível para contratação automática.',
    }
  }

  const vehicleInfo: VehicleInfo = {
    marca: data.vehicle?.marca || params.brandText,
    modelo: data.vehicle?.modelo || params.modelText,
    ano: data.vehicle?.ano || params.year,
    fipeValue: data.vehicle?.fipeValue || 0,
    fipeCode: data.vehicle?.fipeCode || params.codFipe,
    categoria: data.vehicle?.categoria || (params.tipo === 'moto' ? 'MOTOCICLETA' : 'AUTOMOVEL'),
    combustivel: data.vehicle?.combustivel,
  }

  const { plans, regras } = enrichPlansWithRules(vehicleInfo, data.plans)

  return {
    success: true,
    vehicle: vehicleInfo,
    plans,
    powercrmMeta: data.powercrm,
    regras,
  }
}
