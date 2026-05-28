import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, notFound, unauthorized } from '@/lib/api-response'

// PATCH /api/drivers/me — alterna status online/offline do entregador
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const driver = await prisma.deliveryDriver.findUnique({
    where: { userId: session.id },
    select: { id: true, status: true, active: true },
  })
  if (!driver) return notFound('Cadastro de entregador não encontrado')

  const body = await req.json().catch(() => ({}))
  const newActive = typeof body.active === 'boolean' ? body.active : !driver.active

  const updated = await prisma.deliveryDriver.update({
    where: { id: driver.id },
    data: { active: newActive },
    select: { id: true, status: true, active: true },
  })

  return ok(updated)
}

// GET /api/drivers/me — status do cadastro do entregador logado
export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const driver = await prisma.deliveryDriver.findUnique({
    where: { userId: session.id },
    select: {
      id: true,
      status: true,
      active: true,
      vehicle: true,
      vehiclePlate: true,
      deliveryFee: true,
      createdAt: true,
      updatedAt: true,
      city: { select: { name: true, slug: true } },
    },
  })

  if (!driver) return notFound('Cadastro de entregador não encontrado')
  return ok(driver)
}
