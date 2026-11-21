import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// A senha do painel agora vem somente da variável de ambiente ADMIN_PASSWORD (Coolify).
// Gravar senha em arquivo foi removido: ficava em texto puro no volume de dados.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        'A senha do painel é definida pela variável ADMIN_PASSWORD no servidor (Coolify). Altere lá e faça o redeploy.',
    },
    { status: 410 }
  )
}
