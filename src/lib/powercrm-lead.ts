import { LeadSubmissionPayload } from './types'

const POWERCRM_BASE_URL = 'https://app.powercrm.com.br'
const POWERCRM_FORM_CODE = process.env.POWERCRM_FORM_CODE || '4QwWw1QV'
const POWERCRM_CONSULTANT_CODE = process.env.POWERCRM_CONSULTANT_CODE || 'vrXbXyyq'

export interface PowerCrmSubmitResponse {
  success: boolean
  qttnCd?: string
  redirecTo?: string
  message?: string
}

/**
 * Envia o Lead diretamente para o Power CRM usando o formulário público
 * e o código de consultor CITmax (vrXbXyyq).
 * Não necessita de token/senha e espelha automaticamente no CRM 21 Go!
 */
export async function sendLeadToPowerCrm(
  payload: LeadSubmissionPayload
): Promise<PowerCrmSubmitResponse> {
  const cleanPhone = payload.whatsapp.replace(/\D/g, '')
  const cleanPlate = (payload.placa || payload.vehicle.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const isMoto = payload.vehicle.categoria?.toUpperCase().includes('MOTO') || false

  const body = {
    formCode: POWERCRM_FORM_CODE,
    companyUserCode: POWERCRM_CONSULTANT_CODE,
    clientName: payload.nome,
    clientPhone: cleanPhone,
    clientEmail: payload.email || '',
    vehiclePlate: cleanPlate,
    vehicleType: isMoto ? '2' : '1',
    vehicleBranch: payload.vehicle.marca,
    vehicleModel: payload.vehicle.modelo,
    vehicleYear: String(payload.vehicle.ano),
    vehicleIsWork: false,
    observation: `Plano escolhido no site: ${payload.planoEscolhidoNome} | Mensalidade: R$ ${payload.mensalidadeFinal.toFixed(2)} | Ativação: R$ ${payload.ativacao.toFixed(2)} | FIPE: R$ ${payload.vehicle.fipeValue}`,
  }

  try {
    const res = await fetch(`${POWERCRM_BASE_URL}/svQttnDynmcFrm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (21Go Franquia Lead Intake)',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.warn('[PowerCRM] Resposta não-200:', res.status, res.statusText)
      return { success: false, message: res.statusText }
    }

    const data = await res.json()
    console.log('[PowerCRM] Lead cadastrado com sucesso para consultor CITmax:', data)

    return {
      success: data.success || true,
      qttnCd: data.qttnCd,
      redirecTo: data.redirecTo,
      message: data.message || 'Cotação enviada para o Power CRM com sucesso!',
    }
  } catch (err: any) {
    console.error('[PowerCRM] Erro ao enviar lead:', err)
    return { success: false, message: err.message }
  }
}
