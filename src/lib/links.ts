import { StoredLead } from './db'

export const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://21go.seg.br').replace(/\/+$/, '')

/** Caminho relativo da página de pagamento (Pix). A ref é a credencial do link. */
export function pagamentoPath(ref: string): string {
  return `/pagamento?ref=${encodeURIComponent(ref)}`
}

/** Caminho relativo da vistoria digital do lead. */
export function vistoriaPath(lead: Pick<StoredLead, 'ref' | 'nome' | 'placa' | 'vehicle'>): string {
  const veiculo = `${lead.vehicle.marca} ${lead.vehicle.modelo}`
  return `/vistoria?ref=${encodeURIComponent(lead.ref)}&nome=${encodeURIComponent(lead.nome)}&placa=${encodeURIComponent(
    lead.placa || ''
  )}&veiculo=${encodeURIComponent(veiculo)}`
}

export function absolute(path: string): string {
  return path.startsWith('http') ? path : `${APP_BASE_URL}${path}`
}
