import { NextRequest } from 'next/server'
import { z } from 'zod'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { prisma } from '@cc/database'
import { getSessionFromRequest } from '@/lib/auth/session'
import { ok, badRequest, unauthorized, forbidden } from '@/lib/api-response'

const schema = z.object({
  orderId: z.string(),
  /**
   * 'pix' → cria um pagamento Pix direto no MP (retorna qr_code + copia-e-cola)
   * 'checkout' → cria preferência de checkout (retorna init_point para redirecionar)
   */
  mode: z.enum(['pix', 'checkout']).default('checkout'),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return unauthorized()
  if (session.role !== 'CUSTOMER') return forbidden()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { orderId, mode } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId, customerId: session.id },
    include: {
      items: true,
      payment: true,
      company: {
        select: {
          id: true, name: true,
          acceptsMercadoPago: true,
          mercadoPagoToken: true,
        },
      },
    },
  })

  if (!order) return badRequest('Pedido não encontrado')
  if (order.payment?.method !== 'MERCADO_PAGO') return badRequest('Pedido não usa Mercado Pago')
  if (order.payment?.status === 'CONFIRMED') return badRequest('Pagamento já confirmado')
  if (!order.company.acceptsMercadoPago || !order.company.mercadoPagoToken)
    return badRequest('Loja não tem Mercado Pago configurado')

  const client = new MercadoPagoConfig({
    accessToken: order.company.mercadoPagoToken,
  })

  // ── Modo Pix direto ───────────────────────────────────────────────────────
  if (mode === 'pix') {
    const customer = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true },
    })

    const paymentApi = new Payment(client)
    const mpPayment = await paymentApi.create({
      body: {
        transaction_amount: Number(order.total),
        payment_method_id: 'pix',
        description: `Pedido #${order.number} - ${order.company.name}`,
        external_reference: order.id,
        payer: {
          email: customer?.email ?? 'cliente@cidadeconectada.com',
          first_name: customer?.name?.split(' ')[0] ?? 'Cliente',
          last_name: customer?.name?.split(' ').slice(1).join(' ') ?? '',
        },
      },
    })

    const qrCode = mpPayment.point_of_interaction?.transaction_data?.qr_code ?? null
    const qrCodeBase64 = mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    const mpId = String(mpPayment.id ?? '')

    // Salva ID do pagamento MP no registro
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        mercadoPagoId: mpId,
        mercadoPagoExternalRef: order.id,
      },
    })

    return ok({
      mode: 'pix',
      qrCode,
      qrCodeBase64,
      amount: Number(order.total),
      mpPaymentId: mpId,
    })
  }

  // ── Modo checkout (todos os métodos de pagamento) ─────────────────────────
  const preferenceApi = new Preference(client)
  const preference = await preferenceApi.create({
    body: {
      items: order.items.map((item) => ({
        id: item.productId,
        title: item.productName,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        currency_id: 'BRL',
      })),
      external_reference: order.id,
      back_urls: {
        success: `${APP_URL}/api/payments/mp/callback?status=success&orderId=${order.id}`,
        failure: `${APP_URL}/api/payments/mp/callback?status=failure&orderId=${order.id}`,
        pending: `${APP_URL}/api/payments/mp/callback?status=pending&orderId=${order.id}`,
      },
      auto_return: 'approved',
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
      statement_descriptor: 'CIDADE CONECTADA',
      // ── Split (Marketplace) ─────────────────────────────────────────────
      // Descomente quando o app Marketplace for aprovado pelo MP:
      // marketplace: process.env.MERCADO_PAGO_APP_ID,
      // marketplace_fee: platformFee, // taxa da plataforma em R$
      // ───────────────────────────────────────────────────────────────────
    },
  })

  const checkoutUrl = preference.init_point ?? ''

  // Salva URL do checkout no pagamento
  await prisma.payment.update({
    where: { orderId: order.id },
    data: {
      mercadoPagoId: preference.id ?? null,
      mercadoPagoExternalRef: order.id,
      mercadoPagoCheckoutUrl: checkoutUrl,
    },
  })

  return ok({
    mode: 'checkout',
    checkoutUrl,
    preferenceId: preference.id,
  })
}
