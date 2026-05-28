import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden, notFound, badRequest } from '@/lib/api-response'

type Params = { params: Promise<{ companyId: string }> }

// PATCH /api/superadmin/companies/[companyId] — ativa/desativa loja
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { companyId } = await params
  const { active } = await req.json()

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) return notFound('Empresa não encontrada')

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { active },
    select: { id: true, name: true, active: true },
  })

  return ok(updated)
}

// DELETE /api/superadmin/companies/[companyId] — apaga loja (somente se sem pedidos)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { companyId } = await params

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { orders: true } } },
  })
  if (!company) return notFound('Empresa não encontrada')

  if (company._count.orders > 0) {
    return badRequest(
      `Não é possível apagar: a loja possui ${company._count.orders} pedido(s) no histórico. Desative a loja para removê-la do app.`
    )
  }

  // Apaga produtos e dados relacionados primeiro
  await prisma.$transaction([
    prisma.product.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ])

  return ok({ deleted: true })
}
