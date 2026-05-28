import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { getSessionFromRequest } from '@/lib/auth/session'
import { ok, badRequest, unauthorized } from '@/lib/api-response'

// GET /api/users/me — retorna dados atuais do usuário no banco
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, cityId: true, avatarUrl: true },
  })

  if (!user) return unauthorized()
  return ok(user)
}

const patchSchema = z.object({
  name:      z.string().min(2).max(80).optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

// PATCH /api/users/me — atualiza nome e/ou foto de perfil
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return unauthorized()

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const data: Record<string, unknown> = {}
  if (parsed.data.name      !== undefined) data.name      = parsed.data.name
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl

  if (Object.keys(data).length === 0) return badRequest('Nenhum campo para atualizar')

  const user = await prisma.user.update({
    where: { id: session.id },
    data,
    select: { id: true, name: true, email: true, role: true, cityId: true, avatarUrl: true },
  })

  return ok(user)
}
