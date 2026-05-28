import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound, unauthorized } from '@/lib/api-response'
import { queueOrderStatusChanged } from '@/lib/queue'
import { publishEvent } from '@/lib/pubsub'

const schema = z.object({
  code: z.string().length(4),
})

// POST /api/deliveries/:deliveryId/confirm
// Entregador confirma entrega com código de 4 dígitos do cliente
export async function POST(req: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params
  const session = await getSession()
  if (!session || session.role !== 'DELIVERY_DRIVER') return unauthorized()

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { driver: true, order: true },
  })
  if (!delivery) return notFound('Entrega não encontrada')
  if (delivery.driver?.userId !== session.id) return forbidden()
  if (delivery.status === 'DELIVERED') return badRequest('Entrega já confirmada')

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Código inválido')

  if (parsed.data.code !== delivery.confirmationCode) {
    return badRequest('Código de confirmação incorreto')
  }

  const now = new Date()

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: 'DELIVERED', deliveredAt: now },
  })

  const order = await prisma.order.update({
    where: { id: delivery.orderId },
    data: { status: 'DELIVERED' },
  })

  await queueOrderStatusChanged(order.id, 'DELIVERED')

  // ── Realtime SSE ──
  publishEvent(`order:${order.id}`, { type: 'ORDER_UPDATED', orderId: order.id, status: 'DELIVERED' })
  publishEvent(`company:${order.companyId}`, { type: 'ORDER_UPDATED', orderId: order.id, status: 'DELIVERED' })
  if (delivery.driver?.id) {
    publishEvent(`driver:${delivery.driver.id}`, { type: 'DELIVERY_UPDATED', deliveryId, status: 'DELIVERED' })
  }

  return ok({ message: 'Entrega confirmada com sucesso!' })
}
