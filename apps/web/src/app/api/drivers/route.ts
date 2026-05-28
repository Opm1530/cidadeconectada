import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, forbidden, conflict, unauthorized } from '@/lib/api-response'

const registerSchema = z.object({
  cityId: z.string(),
  deliveryFee: z.number().min(0),
  vehicle: z.string().optional(),
  vehiclePlate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const status = searchParams.get('status') ?? 'APPROVED'
  const activeOnly = searchParams.get('active') === 'true'

  const where: Record<string, unknown> = {}
  if (cityId) where.cityId = cityId
  if (status) where.status = status
  if (activeOnly) where.active = true

  const drivers = await prisma.deliveryDriver.findMany({
    where,
    include: { user: { select: { name: true, phone: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return ok(drivers)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const existing = await prisma.deliveryDriver.findUnique({ where: { userId: session.id } })
  if (existing) return conflict('Você já possui cadastro como entregador')

  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { cityId, deliveryFee, vehicle, vehiclePlate } = parsed.data

  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city) return badRequest('Cidade não encontrada')

  // Verifica se há vagas disponíveis
  if (city.maxDrivers !== null) {
    const count = await prisma.deliveryDriver.count({
      where: { cityId, status: { in: ['APPROVED', 'PENDING'] } },
    })
    if (count >= city.maxDrivers) return forbidden('Não há vagas disponíveis para entregadores nesta cidade')
  }

  // Atualiza role do usuário para entregador
  await prisma.user.update({ where: { id: session.id }, data: { role: 'DELIVERY_DRIVER' } })

  const driver = await prisma.deliveryDriver.create({
    data: { userId: session.id, cityId, deliveryFee, vehicle, vehiclePlate },
    include: { user: { select: { name: true, phone: true } } },
  })

  return created(driver)
}
