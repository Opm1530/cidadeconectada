import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { created, badRequest, forbidden, unauthorized } from '@/lib/api-response'

const schema = z.object({
  name: z.string().min(1),
  cityId: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { name, cityId } = parsed.data

  // Verifica se o usuário é admin desta cidade
  const isAdmin =
    session.role === 'SUPER_ADMIN' ||
    !!(await prisma.cityAdmin.findFirst({ where: { userId: session.id, cityId } }))

  if (!isAdmin) return forbidden()

  const neighborhood = await prisma.neighborhood.create({ data: { name, cityId } })
  return created(neighborhood)
}
