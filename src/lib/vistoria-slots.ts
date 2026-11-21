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

export type VistoriaSlot = keyof typeof VISTORIA_SLOTS
export const isVistoriaSlot = (v: string): v is VistoriaSlot => v in VISTORIA_SLOTS

