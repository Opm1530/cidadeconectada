import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, unauthorized } from '@/lib/api-response'
import { generateConfirmationCode } from '@cc/shared'
import { queueOrderCreated, queueDeliveryRequest } from '@/lib/queue'
import { publishEvent } from '@/lib/pubsub'

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
  selectedOptions: z.array(z.object({ optionId: z.string() })).default([]),
})

const createOrderSchema = z.object({
  companyId: z.string(),
  deliveryType: z.enum(['PICKUP', 'OWN_DELIVERY', 'PLATFORM_DRIVER']),
  deliveryAddress: z.string().optional(),
  driverId: z.string().optional(),
  paymentMethod: z.enum(['MERCADO_PAGO', 'PIX', 'CASH_ON_DELIVERY']),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? 1)
  const perPage = Number(searchParams.get('perPage') ?? 20)
  const status = searchParams.get('status')

  // Empresa vê pedidos da sua loja; cliente vê os próprios pedidos
  const where: Record<string, unknown> =
    session.role === 'COMPANY_OWNER'
      ? { company: { ownerId: session.id } }
      : { customerId: session.id }

  if (status) where.status = status

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { options: true } },
        payment: true,
        delivery: { include: { driver: { include: { user: true } } } },
        company: { select: { id: true, name: true, logoUrl: true, whatsapp: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  return ok({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'CUSTOMER') return unauthorized()

  const body = await req.json()
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { companyId, deliveryType, deliveryAddress, driverId, paymentMethod, couponCode, notes, items } =
    parsed.data

  // Valida a empresa e configurações de pagamento/entrega
  const company = await prisma.company.findUnique({ where: { id: companyId, active: true } })
  if (!company) return badRequest('Empresa não encontrada')

  if (paymentMethod === 'MERCADO_PAGO' && !company.acceptsMercadoPago)
    return badRequest('Empresa não aceita Mercado Pago')
  if (paymentMethod === 'PIX' && !company.acceptsPix)
    return badRequest('Empresa não aceita Pix')
  if (paymentMethod === 'CASH_ON_DELIVERY' && !company.acceptsCashOnDelivery)
    return badRequest('Empresa não aceita pagamento na entrega')
  if (paymentMethod === 'PIX' && deliveryType === 'PLATFORM_DRIVER')
    return badRequest('Pix não está disponível para pedidos com entregador da plataforma')
  if (deliveryType === 'PLATFORM_DRIVER' && !company.acceptsPlatformDrivers)
    return badRequest('Empresa não usa entregadores da plataforma')
  if (deliveryType === 'OWN_DELIVERY' && !company.hasOwnDelivery)
    return badRequest('Empresa não possui entrega própria')

  // Valida entregador se selecionado
  let driver = null
  if (deliveryType === 'PLATFORM_DRIVER') {
    if (!driverId) return badRequest('Selecione um entregador')
    driver = await prisma.deliveryDriver.findUnique({
      where: { id: driverId, status: 'APPROVED', active: true, cityId: company.cityId },
    })
    if (!driver) return badRequest('Entregador não disponível')
  }

  // Calcula valores dos itens
  let subtotal = 0
  const orderItemsData = []

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId, companyId, active: true },
      include: { optionGroups: { include: { options: true } } },
    })
    if (!product) return badRequest(`Produto ${item.productId} não encontrado`)

    let unitPrice = Number(product.price)
    const optionsData = []

    for (const sel of item.selectedOptions) {
      let found = false
      for (const group of product.optionGroups) {
        const opt = group.options.find((o) => o.id === sel.optionId)
        if (opt) {
          unitPrice += Number(opt.priceAdd)
          optionsData.push({
            optionId: opt.id,
            name: opt.name,
            priceAdd: Number(opt.priceAdd),
          })
          found = true
          break
        }
      }
      if (!found) return badRequest(`Opção ${sel.optionId} inválida`)
    }

    const totalPrice = unitPrice * item.quantity
    subtotal += totalPrice

    orderItemsData.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      notes: item.notes,
      options: { create: optionsData },
    })
  }

  // Valida cupom (se informado)
  let appliedCoupon: { id: string; type: string; value: number | null } | null = null
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { companyId_code: { companyId, code: couponCode.toUpperCase() } },
    })
    if (!coupon || !coupon.active) return badRequest('Cupom inválido ou inativo')
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return badRequest('Cupom expirado')
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return badRequest('Cupom esgotado')
    if (coupon.minOrder !== null && subtotal < Number(coupon.minOrder))
      return badRequest(`Pedido mínimo de R$ ${Number(coupon.minOrder).toFixed(2)} para este cupom`)
    if (coupon.type === 'FREE_SHIPPING' && deliveryType !== 'OWN_DELIVERY')
      return badRequest('Este cupom é válido apenas para entregas feitas pela loja')
    appliedCoupon = { id: coupon.id, type: coupon.type, value: coupon.value ? Number(coupon.value) : null }
  }

  let deliveryFee =
    deliveryType === 'PLATFORM_DRIVER'
      ? Number(driver!.deliveryFee)
      : deliveryType === 'OWN_DELIVERY'
        ? Number(company.ownDeliveryFee ?? 0)
        : 0

  // Aplica desconto
  let discountAmount = 0
  let subtotalDiscount = 0 // desconto que sai do subtotal (não do frete)
  if (appliedCoupon) {
    if (appliedCoupon.type === 'FREE_SHIPPING') {
      // O frete já fica 0 — discountAmount é só para registro; não toca no subtotal
      discountAmount = deliveryFee
      deliveryFee = 0
    } else if (appliedCoupon.type === 'DISCOUNT_PERCENT') {
      discountAmount = Math.min(subtotal * (appliedCoupon.value! / 100), subtotal)
      subtotalDiscount = discountAmount
    } else if (appliedCoupon.type === 'DISCOUNT_FIXED') {
      discountAmount = Math.min(appliedCoupon.value!, subtotal)
      subtotalDiscount = discountAmount
    }
  }

  const total = subtotal - subtotalDiscount + deliveryFee

  // Gera número sequencial do pedido para a empresa
  const lastOrder = await prisma.order.findFirst({
    where: { companyId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const number = (lastOrder?.number ?? 0) + 1

  const order = await prisma.order.create({
    data: {
      number,
      companyId,
      customerId: session.id,
      deliveryType,
      deliveryAddress,
      deliveryFee,
      subtotal,
      discountAmount,
      total,
      couponId: appliedCoupon?.id ?? undefined,
      notes,
      items: { create: orderItemsData },
      payment: {
        create: {
          method: paymentMethod,
          amount: total,
          pixKey: paymentMethod === 'PIX' ? company.pixKey : undefined,
        },
      },
      delivery:
        deliveryType === 'PLATFORM_DRIVER'
          ? {
              create: {
                driverId: driver!.id,
                confirmationCode: generateConfirmationCode(),
              },
            }
          : undefined,
    },
    include: {
      items: { include: { options: true } },
      payment: true,
      delivery: true,
    },
  })

  // Incrementa uso do cupom
  if (appliedCoupon) {
    prisma.coupon.update({
      where: { id: appliedCoupon.id },
      data: { usedCount: { increment: 1 } },
    }).catch(console.error)
  }

  // Loja sempre notificada imediatamente
  queueOrderCreated(order.id, companyId).catch(console.error)

  // Para entregador da plataforma, também notifica o entregador
  if (deliveryType === 'PLATFORM_DRIVER' && driver) {
    queueDeliveryRequest(order.id, driver.id).catch(console.error)
  }

  // ── Realtime: empurra para os canais SSE ──
  publishEvent(`company:${companyId}`, { type: 'NEW_ORDER', orderId: order.id })
  if (order.delivery?.driverId) {
    publishEvent(`driver:${order.delivery.driverId}`, { type: 'NEW_DELIVERY', orderId: order.id, deliveryId: order.delivery.id })
  } else if (deliveryType === 'PLATFORM_DRIVER') {
    // Entrega ainda não atribuída → avisa todos os entregadores da cidade
    publishEvent(`city:${company.cityId}`, { type: 'NEW_DELIVERY', orderId: order.id })
  }

  return created(order)
}
