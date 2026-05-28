import { NextRequest } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@cc/database'
import { queuePaymentConfirmed } from '@/lib/queue'
import { publishEvent } from '@/lib/pubsub'
import { ok, badRequest } from '@/lib/api-response'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')

  // Valida assinatura HMAC (apenas se configurado)
  if (signature && process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
    const [tsPart, v1Part] = signature.split(',')
    const ts = tsPart?.split('=')[1]
    const v1 = v1Part?.split('=')[1]
    const manifest = `id:${requestId};request-date:${ts};`
    const hmac = crypto
      .createHmac('sha256', process.env.MERCADO_PAGO_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex')
    if (hmac !== v1) return badRequest('Assinatura inválida')
  }

  const data = JSON.parse(body)
  if (data.type !== 'payment') return ok({ received: true })

  const mpPaymentId = String(data.data?.id ?? '')
  if (!mpPaymentId) return badRequest('ID do pagamento ausente')

  // Busca o registro de pagamento pelo ID MP
  const payment = await prisma.payment.findFirst({
    where: { mercadoPagoId: mpPaymentId },
    include: {
      order: {
        include: {
          company: { select: { mercadoPagoToken: true } },
        },
      },
    },
  })

  if (!payment) return ok({ received: true })
  if (payment.status === 'CONFIRMED') return ok({ received: true }) // idempotente

  // Consulta status real no MP (não confiar cegamente no webhook)
  let mpStatus = 'pending'
  try {
    const token = payment.order.company.mercadoPagoToken
    if (token) {
      const client = new MercadoPagoConfig({ accessToken: token })
      const paymentApi = new Payment(client)
      const mpPayment = await paymentApi.get({ id: Number(mpPaymentId) })
      mpStatus = mpPayment.status ?? 'pending'
    }
  } catch (err) {
    console.error('[MP Webhook] Erro ao consultar status:', err)
    // Fallback: usa o status do webhook
    mpStatus = data.action === 'payment.updated' ? 'approved' : 'pending'
  }

  if (mpStatus !== 'approved') return ok({ received: true })

  // Confirma pagamento e atualiza pedido
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
  })

  const updated = await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: 'PAID' },
  })

  await queuePaymentConfirmed(payment.orderId)

  publishEvent(`order:${payment.orderId}`, { type: 'ORDER_UPDATED', orderId: payment.orderId, status: 'PAID' })
  publishEvent(`company:${updated.companyId}`, { type: 'ORDER_UPDATED', orderId: payment.orderId, status: 'PAID' })

  return ok({ received: true })
}
