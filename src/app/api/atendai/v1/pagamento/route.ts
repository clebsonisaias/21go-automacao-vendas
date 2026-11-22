import { NextRequest } from 'next/server'
import { autorizarAtendai, cadastroParaPagamento, chaveTelefone, json, situacaoDoCadastro } from '@/lib/atendai'
import { absolute, pagamentoPath } from '@/lib/links'
import { obterPixDaAdesao } from '@/lib/pix-adesao'
import { limitePorChave, rateLimit } from '@/lib/rate-limit'
import { esc, sendTelegramNotification } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/** Aviso de limite de cobranças: um por cadastro a cada 12 h (o cliente pede de novo e o lembrete convida). */
const LIMITE_AVISADO_MS = 12 * 60 * 60 * 1000
const limiteAvisado = new Map<string, number>()

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/**
 * POST { telefone } → Pix da taxa de adesão do cadastro desse WhatsApp (o que espera o Pix), para o
 * chat mandar na conversa. Mesma regra da página /pagamento: só depois da vistoria aprovada,
 * com o valor do cadastro (`lead.ativacao`); o Pix que ainda vale é reaproveitado.
 *
 * O telefone é o da conversa (vem do AtendeHub, nunca do modelo). A resposta traz o
 * copia-e-cola e o link da página do Pix, e nenhum dado pessoal.
 */
export async function POST(req: NextRequest) {
  const negado = autorizarAtendai(req)
  if (negado) return negado
  if (!rateLimit(req, 'atendai-pagamento', 120, 10 * 60 * 1000)) {
    return json({ erro: 'Muitos pedidos seguidos. Tente de novo em alguns minutos.' }, 429)
  }
  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400)
  }
  const telefone = String(corpo?.telefone ?? '')
  const chave = chaveTelefone(telefone)
  if (!chave) return json({ erro: 'Telefone inválido.' }, 400)
  // Cada pedido pode gerar uma ordem no Mercado Pago: freio por cliente, além do freio geral.
  if (!limitePorChave('atendai-pagamento-tel', chave, 6, 10 * 60 * 1000)) {
    return json({ erro: 'Muitos pedidos de Pix seguidos. Peça de novo em alguns minutos.' }, 429)
  }

  const lead = cadastroParaPagamento(telefone)
  if (!lead) {
    return json({
      encontrado: false,
      situacao: 'sem_cadastro',
      mensagem: 'Não achei cadastro da 21Go para este WhatsApp. Faça a cotação para começar.',
    })
  }
  const link = absolute(pagamentoPath(lead.ref))
  const placa = lead.placa || lead.vehicle?.placa || null

  try {
    const r = await obterPixDaAdesao(lead)
    switch (r.status) {
      case 'pendente':
        return json({
          encontrado: true,
          situacao: 'pix',
          placa,
          valor: r.pagamento.valor,
          pixCopiaECola: r.pagamento.qrCode ?? null,
          expiraEm: r.pagamento.expiresAt ?? null,
          link,
          mensagem: `Pix da taxa de adesão: ${brl(r.pagamento.valor)}. Copie o código Pix e pague no app do banco; a confirmação é automática. Se preferir, o QR Code está no link.`,
        })
      case 'pago':
        return json({ encontrado: true, situacao: 'pago', placa, mensagem: 'A taxa de adesão já está paga. A 21Go envia os dados de acesso por e-mail e WhatsApp.' })
      case 'gratis':
        return json({ encontrado: true, situacao: 'gratis', placa, mensagem: 'A adesão ficou grátis com o cupom: não há Pix a pagar.' })
      case 'bloqueado': {
        const s = situacaoDoCadastro(lead)
        // Cadastro concluído sem Pix do site (aprovado com o Pix desligado): não há o que pagar aqui.
        if (s.etapa === 'concluido') {
          return json({ encontrado: true, situacao: 'concluido', placa, etapaTexto: s.etapaTexto, proximoPasso: s.proximoPasso, mensagem: 'Este cadastro já está concluído: não há Pix da adesão a pagar por aqui.' })
        }
        return json({
          encontrado: true,
          situacao: 'aguardando_vistoria',
          placa,
          etapa: s.etapa,
          etapaTexto: s.etapaTexto,
          proximoPasso: s.proximoPasso,
          links: s.links,
          mensagem: 'O Pix da adesão só é liberado depois que a vistoria é aprovada. A adesão é o último passo.',
        })
      }
      case 'indisponivel':
        return json({
          encontrado: true,
          situacao: 'indisponivel',
          placa,
          ...(lead.checkoutUrl ? { link: lead.checkoutUrl } : {}),
          mensagem: lead.checkoutUrl
            ? 'O pagamento da adesão é pelo link de pagamento.'
            : 'O pagamento pelo chat está indisponível agora. Tente de novo mais tarde.',
        })
      case 'limite': {
        const agora = Date.now()
        if ((limiteAvisado.get(lead.ref) ?? 0) < agora - LIMITE_AVISADO_MS) {
          limiteAvisado.set(lead.ref, agora)
          if (limiteAvisado.size > 500) limiteAvisado.clear()
          await sendTelegramNotification(
            `⚠️ <b>Pix da adesão pelo chat:</b> limite de cobranças atingido para a placa ${esc(placa || 'sem placa')}. Confira o cadastro no /admin.`
          )
        }
        return json({
          encontrado: true,
          situacao: 'limite',
          placa,
          mensagem: 'Não consigo gerar outro Pix para este cadastro agora. A equipe da 21Go foi avisada e entra em contato.',
        })
      }
      case 'valor_mudou':
        return json({ erro: 'O valor da adesão acabou de mudar. Peça o Pix de novo em instantes.' }, 409)
      case 'cancelado':
        return json({ encontrado: false, situacao: 'sem_cadastro', mensagem: 'Este cadastro foi encerrado. Faça uma nova cotação.' })
    }
  } catch (err) {
    console.error('[/api/atendai/v1/pagamento]', err instanceof Error ? err.message : err)
    return json({ erro: 'Não foi possível gerar o Pix agora. Tente de novo em alguns minutos.' }, 502)
  }
}
