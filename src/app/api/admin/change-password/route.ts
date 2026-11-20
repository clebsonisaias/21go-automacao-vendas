import { NextRequest, NextResponse } from 'next/server'
import { getAdminPassword, saveAdminPassword } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Preencha a senha atual e a nova senha.' },
        { status: 400 }
      )
    }

    const activePassword = getAdminPassword()

    if (currentPassword !== activePassword) {
      return NextResponse.json(
        { success: false, error: 'A senha atual informada está incorreta.' },
        { status: 403 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' },
        { status: 400 }
      )
    }

    const saved = saveAdminPassword(newPassword)

    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Falha ao gravar nova senha no servidor.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Senha do painel alterada com sucesso!',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Erro no servidor: ${message}` },
      { status: 500 }
    )
  }
}
