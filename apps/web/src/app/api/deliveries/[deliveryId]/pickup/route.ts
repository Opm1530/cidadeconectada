import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden, notFound, conflict } from '@/lib/api-response'
import { queueDeliveryPickedUp, queueOrderStatusChanged } from '@/lib/queue'
import { publishEvent } from '@/lib/pubsub'

// PATCH /api/deliveries/[deliveryId]/pickup — entregador confirma que coletou o pedido
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
    include: { order: { select: { id: true, status: true, companyId: true } } },
  })
  if (!delivery) return notFound()
  if (delivery.driverId !== driver.id) return forbidden()
  if (delivery.status !== 'ACCEPTED') return conflict('Entrega precisa estar aceita antes de coletar')

  // Marca entrega como coletada e pedido como OUT_FOR_DELIVERY
  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'PICKED_UP' },
    }),
    prisma.order.update({
      where: { id: delivery.order.id },
      data: { status: 'OUT_FOR_DELIVERY' },
    }),
  ])

  // Notifica cliente que o pedido saiu para entrega
  await queueDeliveryPickedUp(delivery.order.id)
  await queueOrderStatusChanged(delivery.order.id, 'OUT_FOR_DELIVERY')

  // ── Realtime SSE ──
  publishEvent(`order:${delivery.order.id}`, { type: 'ORDER_UPDATED', orderId: delivery.order.id, status: 'OUT_FOR_DELIVERY' })
  publishEvent(`driver:${driver.id}`, { type: 'DELIVERY_UPDATED', deliveryId, status: 'PICKED_UP' })
  publishEvent(`company:${delivery.order.companyId}`, { type: 'ORDER_UPDATED', orderId: delivery.order.id, status: 'OUT_FOR_DELIVERY' })

  return ok({ success: true })
}
