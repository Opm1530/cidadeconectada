import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound, unauthorized, noContent } from '@/lib/api-response'

async function getCouponAndVerify(couponId: string, userId: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: { company: { select: { ownerId: true } } },
  })
  if (!coupon) return { coupon: null, error: notFound('Cupom não encontrado') }
  if (coupon.company.ownerId !== userId) return { coupon: null, error: forbidden() }
  return { coupon, error: null }
}

const patchSchema = z.object({
  active: z.boolean().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

// PATCH /api/coupons/[couponId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const { coupon, error } = await getCouponAndVerify(couponId, session.id)
  if (error) return error

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const updated = await prisma.coupon.update({
    where: { id: coupon!.id },
    data: {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt !== undefined
        ? (parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null)
        : undefined,
    },
  })
  return ok(updated)
}

// DELETE /api/coupons/[couponId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const { coupon, error } = await getCouponAndVerify(couponId, session.id)
  if (error) return error

  await prisma.coupon.delete({ where: { id: coupon!.id } })
  return noContent()
}
