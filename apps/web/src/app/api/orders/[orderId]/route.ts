import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound, unauthorized } from '@/lib/api-response'
import { queueOrderStatusChanged, queuePaymentConfirmed, queueOrderReady } from '@/lib/queue'
import { publishEvent } from '@/lib/pubsub'

const updateStatusSchema = z.object({
  status: z.enum(['PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  // DELIVERED já estava aqui, mas garantimos que vem junto com validação de deliveryType no cliente
})

const confirmPaymentSchema = z.object({
  action: z.literal('confirm_payment'),
})

const schema = z.union([updateStatusSchema, confirmPaymentSchema])

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { options: true, product: { select: { name: true } } } },
      payment: true,
      delivery: { include: { driver: { include: { user: true } } } },
      company: { select: { id: true, name: true, logoUrl: true, whatsapp: true, ownerId: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  })

  if (!order) return notFound('Pedido não encontrado')

  // Apenas o cliente dono do pedido, dono da empresa ou admin podem ver
  const isCustomer = order.customerId === session.id
  const isCompany = order.company.ownerId === session.id
  const isAdmin = session.role === 'CITY_ADMIN' || session.role === 'SUPER_ADMIN'
  if (!isCustomer && !isCompany && !isAdmin) return forbidden()

  return ok(order)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { company: true, payment: true },
  })
  if (!order) return notFound('Pedido não encontrado')

  const isCompanyOwner = order.company.ownerId === session.id
  const isAdmin = session.role === 'CITY_ADMIN' || session.role === 'SUPER_ADMIN'
  if (!isCompanyOwner && !isAdmin) return forbidden()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  if ('action' in parsed.data && parsed.data.action === 'confirm_payment') {
    // Confirma pagamento Pix manualmente
    if (order.payment?.method !== 'PIX') return badRequest('Apenas pagamentos Pix podem ser confirmados manualmente')

    await prisma.payment.update({
      where: { orderId: order.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    })

    queuePaymentConfirmed(order.id).catch(console.error)
    publishEvent(`order:${order.id}`, { type: 'ORDER_UPDATED', orderId: order.id, status: 'PAID' })
    publishEvent(`company:${order.companyId}`, { type: 'ORDER_UPDATED', orderId: order.id, status: 'PAID' })
    return ok(updated)
  }

  // Atualiza status do pedido
  const { status } = parsed.data as z.infer<typeof updateStatusSchema>
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status },
    include: { delivery: { select: { id: true } } },
  })

  queueOrderStatusChanged(order.id, status).catch(console.error)

  if (status === 'READY_FOR_PICKUP' && updated.delivery?.id) {
    queueOrderReady(order.id, updated.delivery.id).catch(console.error)
  }

  // ── Realtime SSE ──
  publishEvent(`order:${order.id}`, { type: 'ORDER_UPDATED', orderId: order.id, status })
  publishEvent(`company:${order.companyId}`, { type: 'ORDER_UPDATED', orderId: order.id, status })
  // Busca driverId para notificar o entregador também
  prisma.delivery.findFirst({
    where: { orderId: order.id },
    select: { driverId: true },
  }).then(delivery => {
    if (delivery?.driverId) {
      publishEvent(`driver:${delivery.driverId}`, { type: 'ORDER_UPDATED', orderId: order.id, status })
    }
  }).catch(() => {})

  return ok(updated)
}
