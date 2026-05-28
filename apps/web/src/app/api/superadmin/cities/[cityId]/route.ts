import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden, notFound, badRequest } from '@/lib/api-response'

type Params = { params: Promise<{ cityId: string }> }

// PATCH /api/superadmin/cities/[cityId] — ativa/desativa cidade
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { cityId } = await params
  const { active } = await req.json()

  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city) return notFound('Cidade não encontrada')

  const updated = await prisma.city.update({
    where: { id: cityId },
    data: { active },
    select: { id: true, name: true, active: true },
  })

  return ok(updated)
}

// DELETE /api/superadmin/cities/[cityId] — apaga cidade (somente se vazia)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { cityId } = await params

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { _count: { select: { companies: true, users: true, drivers: true } } },
  })
  if (!city) return notFound('Cidade não encontrada')

  const total = city._count.companies + city._count.users + city._count.drivers
  if (total > 0) {
    return badRequest(
      `Não é possível apagar: a cidade possui ${city._count.companies} empresa(s), ${city._count.drivers} entregador(es) e ${city._count.users} usuário(s). Desative a cidade ou remova os dados primeiro.`
    )
  }

  await prisma.city.delete({ where: { id: cityId } })
  return ok({ deleted: true })
}
