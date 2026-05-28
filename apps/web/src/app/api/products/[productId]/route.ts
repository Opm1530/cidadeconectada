import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound, unauthorized, noContent } from '@/lib/api-response'

const optionSchema = z.object({
  name: z.string().min(1),
  priceAdd: z.number().min(0).default(0),
})

const optionGroupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  options: z.array(optionSchema).default([]),
})

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0).optional(),
  imageUrl: z.string().url().nullable().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  optionGroups: z.array(optionGroupSchema).optional(),
})

async function getProductAndVerifyOwner(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { company: true },
  })
  if (!product) return { product: null, error: notFound('Produto não encontrado') }
  if (product.company.ownerId !== userId) return { product: null, error: forbidden() }
  return { product, error: null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      optionGroups: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!product) return notFound('Produto não encontrado')
  return ok(product)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const { product, error } = await getProductAndVerifyOwner(productId, session.id)
  if (error) return error

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { optionGroups, ...productData } = parsed.data

  let updated
  if (optionGroups !== undefined) {
    updated = await prisma.$transaction(async (tx) => {
      await tx.productOptionGroup.deleteMany({ where: { productId: product!.id } })
      return tx.product.update({
        where: { id: product!.id },
        data: {
          ...productData,
          optionGroups: {
            create: optionGroups.map((group, gi) => ({
              name: group.name,
              type: group.type,
              required: group.required,
              minSelect: group.minSelect,
              maxSelect: group.maxSelect,
              order: gi,
              options: {
                create: group.options.map((opt, oi) => ({
                  name: opt.name,
                  priceAdd: opt.priceAdd,
                  order: oi,
                })),
              },
            })),
          },
        },
        include: {
          optionGroups: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      })
    })
  } else {
    updated = await prisma.product.update({ where: { id: product!.id }, data: productData })
  }
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const { product, error } = await getProductAndVerifyOwner(productId, session.id)
  if (error) return error

  // Hard delete se não houver pedidos; caso contrário, só oculta
  const orderCount = await prisma.orderItem.count({ where: { productId: product!.id } })
  if (orderCount > 0) {
    await prisma.product.update({ where: { id: product!.id }, data: { active: false } })
  } else {
    await prisma.product.delete({ where: { id: product!.id } })
  }
  return noContent()
}
