import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { ok, unauthorized, forbidden } from '@/lib/api-response'

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'DELIVERY_DRIVER') return forbidden()

  const driver = await prisma.deliveryDriver.findFirst({
    where: { userId: session.id, status: 'APPROVED' },
  })
  if (!driver) return forbidden()

  const orderSelect = {
    id: true,
    number: true,
    status: true,          // ← obrigatório para mostrar botão "Coletei o pedido!"
    deliveryAddress: true,
    deliveryFee: true,
    company: { select: { name: true } },
    customer: { select: { name: true, phone: true } },
  }

  // Entregas ativas deste entregador (pendente, aceita, coletada) + últimas entregues
  const deliveries = await prisma.delivery.findMany({
    where: {
      OR: [
        { driverId: driver.id, status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] } },
        { driverId: driver.id, status: 'DELIVERED' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { order: { select: orderSelect } },
  })

  // Entregas sem entregador na mesma cidade (entregador pode auto-atribuir)
  const unassigned = await prisma.delivery.findMany({
    where: {
      driverId: null,
      status: 'PENDING',
      order: { company: { cityId: driver.cityId } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { order: { select: orderSelect } },
  })

  // Merge, dedup
  const all = [...deliveries]
  for (const d of unassigned) {
    if (!all.find((x) => x.id === d.id)) all.push(d)
  }

  return ok(all)
}
