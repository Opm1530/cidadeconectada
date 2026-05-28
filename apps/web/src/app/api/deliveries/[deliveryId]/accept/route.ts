import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden, notFound, conflict } from '@/lib/api-response'
import { queueDriverAccepted } from '@/lib/queue'
import { publishEvent } from '@/lib/pubsub'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'DELIVERY_DRIVER') return forbidden()

  const driver = await prisma.deliveryDriver.findFirst({
    where: { userId: session.id, status: 'APPROVED' },
  })
  if (!driver) return forbidden()

  const { deliveryId } = await params

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: { select: { id: true, status: true, company: { select: { id: true, cityId: true } } } } },
  })
  if (!delivery) return notFound()
  if (delivery.order.company.cityId !== driver.cityId) return forbidden()
  if (delivery.status !== 'PENDING') return conflict('Entrega não está disponível')
  if (delivery.driverId && delivery.driverId !== driver.id) return conflict('Entrega já foi aceita por outro entregador')

  // Aceita a entrega — pedido continua CREATED, loja decide quando preparar
  const updated = await prisma.delivery.update({
    where: { id: deliveryId },
    data: { driverId: driver.id, status: 'ACCEPTED' },
    include: {
      order: {
        select: {
          id: true,
          number: true,
          status: true,
          deliveryAddress: true,
          company: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
        },
      },
    },
  })

  // Notifica a loja que o entregador aceitou (sem travar a resposta)
  queueDriverAccepted(delivery.order.id, deliveryId).catch(console.error)

  // ── Realtime SSE ──
  publishEvent(`driver:${driver.id}`, { type: 'DELIVERY_UPDATED', deliveryId, status: 'ACCEPTED', orderId: delivery.order.id })
  publishEvent(`order:${delivery.order.id}`, { type: 'DELIVERY_UPDATED', deliveryId, status: 'ACCEPTED' })
  publishEvent(`company:${delivery.order.company.id}`, { type: 'DELIVERY_ACCEPTED', orderId: delivery.order.id, deliveryId })
  // Remove da lista de entregas disponíveis para outros entregadores da cidade
  publishEvent(`city:${driver.cityId}`, { type: 'DELIVERY_TAKEN', deliveryId })

  return ok(updated)
}
