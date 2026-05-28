import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, unauthorized } from '@/lib/api-response'

// PUT /api/users/me/push-token — salva/atualiza o Expo push token do usuário logado
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { pushToken } = await req.json()
  if (!pushToken || typeof pushToken !== 'string') return badRequest('pushToken inválido')

  await prisma.user.update({
    where: { id: session.id },
    data: { pushToken },
  })

  return ok({ ok: true })
}

// DELETE /api/users/me/push-token — remove o push token (logout)
export async function DELETE(_req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  await prisma.user.update({
    where: { id: session.id },
    data: { pushToken: null },
  })

  return ok({ ok: true })
}
