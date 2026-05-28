import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden, notFound, badRequest } from '@/lib/api-response'

type Params = { params: Promise<{ userId: string }> }

const patchSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'CITY_ADMIN', 'COMPANY_OWNER', 'CUSTOMER', 'DELIVERY_DRIVER']).optional(),
})

// PATCH /api/superadmin/users/[userId] — altera role do usuário
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { userId } = await params
  if (userId === session.id) return badRequest('Você não pode alterar sua própria conta.')

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return notFound('Usuário não encontrado')

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true },
  })

  // Nota: NÃO invalidamos os tokens. O endpoint /api/auth/refresh já lê o role
  // atual do banco, então na próxima renovação o usuário recebe um JWT com o
  // role correto. O useSessionSync no mobile detecta a mudança em até 30s e
  // aciona o refresh automaticamente — sem deslogar o usuário.
  return ok(updated)
}

// DELETE /api/superadmin/users/[userId] — apaga usuário (somente se sem pedidos)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { userId } = await params
  if (userId === session.id) return badRequest('Você não pode apagar sua própria conta.')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { orders: true } } },
  })
  if (!user) return notFound('Usuário não encontrado')

  if (user.role === 'SUPER_ADMIN') return forbidden()

  if (user._count.orders > 0) {
    return badRequest(
      `Não é possível apagar: usuário possui ${user._count.orders} pedido(s) no histórico.`
    )
  }

  // Remove registros dependentes sem cascade antes de apagar o usuário
  await prisma.deliveryDriver.deleteMany({ where: { userId } })
  await prisma.cityAdmin.deleteMany({ where: { userId } })

  await prisma.user.delete({ where: { id: userId } })
  return ok({ deleted: true })
}
