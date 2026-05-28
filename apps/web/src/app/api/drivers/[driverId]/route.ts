import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound, unauthorized } from '@/lib/api-response'
import { queueDriverApproved } from '@/lib/queue'

const updateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  active: z.boolean().optional(),
  deliveryFee: z.number().min(0).optional(),
  vehicle: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params
  const driver = await prisma.deliveryDriver.findUnique({
    where: { id: driverId },
    include: { user: { select: { name: true, phone: true, email: true, avatarUrl: true } } },
  })
  if (!driver) return notFound('Entregador não encontrado')
  return ok(driver)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const driver = await prisma.deliveryDriver.findUnique({ where: { id: driverId } })
  if (!driver) return notFound('Entregador não encontrado')

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  // Apenas o próprio entregador pode alterar disponibilidade e taxa
  // Apenas admin da cidade pode aprovar/rejeitar/suspender
  const isOwnDriver = driver.userId === session.id
  const isAdmin = session.role === 'CITY_ADMIN' || session.role === 'SUPER_ADMIN'

  if (parsed.data.status && !isAdmin) return forbidden('Apenas admins podem alterar o status do entregador')
  if ((parsed.data.active !== undefined || parsed.data.deliveryFee !== undefined) && !isOwnDriver && !isAdmin)
    return forbidden()

  const wasApproved = driver.status !== 'APPROVED' && parsed.data.status === 'APPROVED'

  const updated = await prisma.deliveryDriver.update({
    where: { id: driverId },
    data: parsed.data,
  })

  if (wasApproved) await queueDriverApproved(driverId)

  return ok(updated)
}
