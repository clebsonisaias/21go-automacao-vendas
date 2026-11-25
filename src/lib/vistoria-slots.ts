// Itens da vistoria (compartilhado entre servidor e navegador).
export const VISTORIA_SLOTS = {
  cnhOuRg: { label: 'CNH ou RG', pdf: true },
  crlv: { label: 'CRLV', pdf: true },
  comprovanteResidencia: { label: 'Comprovante de residência', pdf: true },
  fotoFrente: { label: 'Frente', pdf: false },
  fotoTraseira: { label: 'Traseira', pdf: false },
  fotoLatDir: { label: 'Lateral direita', pdf: false },
  fotoLatEsq: { label: 'Lateral esquerda', pdf: false },
  fotoPainel: { label: 'Painel com KM', pdf: false },
} as const

/**
 * Como pedir os documentos ao cliente (WhatsApp e API do chat). PDF digital é lido por código,
 * sem IA e sem erro de foto (src/lib/documento-pdf.ts); a foto continua aceita.
 */
export const DOCUMENTOS_EM_PDF =
  'de preferência em PDF (a CNH e o documento do carro saem em PDF no app Carteira Digital de Trânsito; a conta de luz ou de água, no site ou app da empresa). Se não tiver o PDF, pode mandar foto'

export type VistoriaSlot = keyof typeof VISTORIA_SLOTS
export const isVistoriaSlot = (v: string): v is VistoriaSlot => v in VISTORIA_SLOTS

