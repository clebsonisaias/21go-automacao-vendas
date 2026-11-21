import { LeadSubmissionPayload } from './types'

// Envio de leads ao Power CRM pelo formulário dinâmico oficial (o mesmo que o cotacao.me usa).
// Formato espelhado do script oficial: resources.powercrm.com.br/assets/external/js/script.pwrcrm.js
//
// Pontos que faziam o envio falhar antes:
//   • sem `companyHash` o endpoint responde 500/400 (o script oficial sempre envia);
//   • marca, modelo, ano e cidade são IDs do Power CRM, não nomes;
//   • telefone no formato "(84) 99999-0000".

const POWERCRM_BASE_URL = 'https://app.powercrm.com.br'
const UTILITIES_URL = 'https://utilities.powercrm.com.br'
const POWERCRM_FORM_CODE = process.env.POWERCRM_FORM_CODE || '4QwWw1QV'
const POWERCRM_CONSULTANT_CODE = process.env.POWERCRM_CONSULTANT_CODE || 'vrXbXyyq'
/** UF usada quando o cliente informa só o nome da cidade. */
const DEFAULT_UF = (process.env.POWERCRM_DEFAULT_UF || 'RN').toUpperCase()

/** Nome usado no PowerCRM até a CNH ser lida (o CRM 21Go troca pelo nome do documento). */
export const NOME_PROVISORIO = 'Cliente 21go.seg.br'

export interface PowerCrmSubmitResponse {
  success: boolean
  qttnCd?: string
  quotationId?: number
  redirecTo?: string
  message?: string
}

interface FormConfig {
  companyHash: string
  leadSource?: number
  pipelineColumn?: number
  funnelStage?: string
}

const ONE_HOUR = 60 * 60 * 1000
let formCache: { at: number; cfg: FormConfig } | null = null
const citiesCache = new Map<number, { at: number; list: Array<{ id: number; text: string }> }>()
let statesCache: { at: number; list: Array<{ id: number; text: string; back: string }> } | null = null

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
  return (await res.json()) as T
}

/** Lê a configuração pública do formulário (hash da empresa, origem do lead, coluna do funil). */
async function getFormConfig(): Promise<FormConfig> {
  if (formCache && Date.now() - formCache.at < ONE_HOUR) return formCache.cfg
  const f = await getJson<{
    companyHash?: string
    leadSourceId?: number
    leadSubSourceId?: number
    pipelineColumnId?: number
    funnelStageId?: string | null
  }>(`${POWERCRM_BASE_URL}/frmByCd?code=${encodeURIComponent(POWERCRM_FORM_CODE)}`)
  if (!f.companyHash) throw new Error('Formulário do Power CRM sem companyHash')
  const cfg: FormConfig = {
    companyHash: f.companyHash,
    leadSource: f.leadSubSourceId || f.leadSourceId || undefined,
    pipelineColumn: f.pipelineColumnId || undefined,
    funnelStage: f.funnelStageId && f.funnelStageId.length > 0 ? f.funnelStageId : undefined,
  }
  formCache = { at: Date.now(), cfg }
  return cfg
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Converte "Parnamirim", "Natal - RN" ou "Natal/RN" no ID de cidade do Power CRM. */
export async function resolveCityId(cidadeRaw?: string, ufRaw?: string): Promise<number | undefined> {
  if (!cidadeRaw) return undefined
  const m = cidadeRaw.match(/^(.*?)\s*[-/,]\s*([A-Za-z]{2})$/)
  const cidade = norm(m ? m[1] : cidadeRaw)
  const uf = (ufRaw || (m ? m[2] : '') || DEFAULT_UF).toUpperCase()
  if (!cidade) return undefined

  try {
    if (!statesCache || Date.now() - statesCache.at > 24 * ONE_HOUR) {
      statesCache = { at: Date.now(), list: await getJson(`${UTILITIES_URL}/state/stt`) }
    }
    const state = statesCache.list.find((s) => (s.back || '').toUpperCase() === uf)
    if (!state) return undefined

    let cached = citiesCache.get(state.id)
    if (!cached || Date.now() - cached.at > 24 * ONE_HOUR) {
      cached = { at: Date.now(), list: await getJson(`${UTILITIES_URL}/city/ct?st=${state.id}`) }
      citiesCache.set(state.id, cached)
    }
    return cached.list.find((c) => norm(c.text) === cidade)?.id
  } catch (err) {
    console.warn('[PowerCRM] Não foi possível resolver a cidade:', err instanceof Error ? err.message : err)
    return undefined
  }
}

/** "(84) 99999-0000" — mesma máscara do formulário oficial. */
export function maskPhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

/** Monta o corpo exatamente como o formulário oficial, com os IDs reais da cotação (powercrmMeta). */
export async function buildPowerCrmBody(payload: LeadSubmissionPayload): Promise<Record<string, unknown>> {
  const form = await getFormConfig()
  const cleanPlate = (payload.placa || payload.vehicle.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const isMoto = payload.vehicle.categoria?.toUpperCase().includes('MOTO') || false
  const cityId = await resolveCityId(payload.cidade, payload.estado)
  const meta = payload.powercrmMeta
  const year = String(payload.vehicle.ano || '').match(/\d{4}/)?.[0]
  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  return {
    companyHash: form.companyHash,
    formCode: POWERCRM_FORM_CODE,
    ...(form.leadSource ? { leadSource: String(form.leadSource) } : {}),
    ...(form.pipelineColumn ? { pipelineColumn: String(form.pipelineColumn) } : {}),
    ...(form.funnelStage ? { funnelStage: form.funnelStage } : {}),
    companyUserCode: POWERCRM_CONSULTANT_CODE,
    clientName: (payload.nome || '').trim() || NOME_PROVISORIO,
    clientPhone: maskPhone(payload.whatsapp),
    ...(payload.email ? { clientEmail: payload.email } : {}),
    ...(cityId ? { clientCity: String(cityId) } : {}),
    ...(cleanPlate ? { vehiclePlate: cleanPlate } : {}),
    vehicleType: isMoto ? '2' : '1',
    ...(meta?.brandId ? { vehicleBranch: String(meta.brandId) } : {}),
    ...(meta?.modelId ? { vehicleModel: String(meta.modelId) } : {}),
    ...(year ? { vehicleYear: year } : {}),
    vehicleIsWork: Boolean(payload.veiculoTrabalho),
    observation: [
      `Site 21go.seg.br`,
      `Veículo: ${payload.vehicle.marca} ${payload.vehicle.modelo} ${payload.vehicle.ano}`,
      `FIPE ${payload.vehicle.fipeCode}: ${brl(payload.vehicle.fipeValue || 0)}`,
      `Plano: ${payload.planoEscolhidoNome}`,
      `Mensalidade: ${brl(payload.mensalidadeFinal)}`,
      `Adesão: ${brl(payload.ativacao)}`,
      `CPF: ${payload.cpf || 'não informado'}`,
      `Cidade: ${payload.cidade || 'não informada'}`,
      `Trabalho/app: ${payload.veiculoTrabalho ? 'SIM' : 'NÃO'}`,
    ].join(' | '),
    utmParameters: {},
  }
}

/** Envia o lead ao Power CRM (formulário oficial + código do consultor CITmax). */
export async function sendLeadToPowerCrm(payload: LeadSubmissionPayload): Promise<PowerCrmSubmitResponse> {
  try {
    const body = await buildPowerCrmBody(payload)
    const res = await fetch(`${POWERCRM_BASE_URL}/svQttnDynmcFrm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.success !== true) {
      console.warn('[PowerCRM] Lead recusado:', res.status, JSON.stringify(data).slice(0, 300))
      return { success: false, message: data?.message || `HTTP ${res.status}` }
    }

    console.log('[PowerCRM] Lead cadastrado. quotationId:', data.quotationId)
    return {
      success: true,
      qttnCd: data.qttnCd,
      quotationId: data.quotationId,
      redirecTo: data.redirecTo,
      message: data.message,
    }
  } catch (err) {
    console.error('[PowerCRM] Erro ao enviar lead:', err instanceof Error ? err.message : err)
    return { success: false, message: err instanceof Error ? err.message : String(err) }
  }
}
