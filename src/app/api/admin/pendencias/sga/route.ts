import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { findLeadByRef, updateLead } from '@/lib/db'
import { pendenciaDoLead } from '@/lib/pendencias'

export const dynamic = 'force-dynamic'

/** POST { ref } → marca que o associado foi cadastrado no Hinova SGA (sai da lista de pendências). */
export async function POST(req: NextRequest) {
  const blocked = await checkAdminAuth(req)
  if (blocked) return blocked
  const body = await req.json().catch(() => null)
  const ref = typeof body?.ref === 'string' ? body.ref : ''
  const lead = ref ? findLeadByRef(ref) : undefined
  if (!lead) return NextResponse.json({ success: false, error: 'Cadastro não encontrado.' }, { status: 404 })
  if (pendenciaDoLead(lead, Date.now())?.tipo !== 'cadastrar_sga') {
    return NextResponse.json({ success: false, error: 'Este cadastro não está esperando o SGA.' }, { status: 409 })
  }
  const em = new Date().toISOString()
  updateLead(ref, (l) => {
    if (!l.sgaCadastradoEm) l.sgaCadastradoEm = em
  })
  return NextResponse.json({ success: true, em })
}
