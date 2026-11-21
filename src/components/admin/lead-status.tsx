import type { StoredLead } from '@/lib/db'

export type LeadStatus = StoredLead['status']

// Status do funil: rótulo + cor do marcador. Texto sempre em cor neutra (contraste AA);
// a cor fica só no ponto, sem "pílula" pastel.
export const STATUS_META: Record<LeadStatus, { label: string; dot: string; order: number }> = {
  aguardando_pagamento: { label: 'Aguardando Pix', dot: 'bg-amber-500', order: 1 },
  adesao_paga: { label: 'Adesão paga', dot: 'bg-emerald-600', order: 2 },
  pendente_vistoria: { label: 'Aguardando vistoria', dot: 'bg-amber-500', order: 3 },
  vistoria_enviada: { label: 'Vistoria enviada', dot: 'bg-sky-600', order: 4 },
  aprovado: { label: 'Aprovado', dot: 'bg-emerald-600', order: 5 },
  cotacoes_recebidas: { label: 'Cotação recebida (CRM)', dot: 'bg-slate-400', order: 6 },
  em_negociacao: { label: 'Em negociação (CRM)', dot: 'bg-indigo-500', order: 7 },
  vendas_concretizadas: { label: 'Venda concretizada (CRM)', dot: 'bg-emerald-700', order: 8 },
  cancelado: { label: 'Cancelado', dot: 'bg-red-600', order: 9 },
}

export function StatusLabel({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status] ?? { label: status, dot: 'bg-slate-400' }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-navy-800">
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
