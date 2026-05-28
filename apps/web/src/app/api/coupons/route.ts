import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, forbidden, unauthorized, conflict } from '@/lib/api-response'

const createSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  type: z.enum(['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_SHIPPING']),
  value: z.number().min(0).optional(),
  minOrder: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
})

// GET /api/coupons — lista cupons da empresa do lojista
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'COMPANY_OWNER') return forbidden()

  const company = await prisma.company.findUnique({ where: { ownerId: session.id }, select: { id: true } })
  if (!company) return forbidden()

  const coupons = await prisma.coupon.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, code: true, type: true, value: true,
      minOrder: true, maxUses: true, usedCount: true,
      active: true, expiresAt: true, createdAt: true,
      _count: { select: { orders: true } },
    },
  })

  return ok(coupons)
}

// POST /api/coupons — cria cupom
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'COMPANY_OWNER') return forbidden()

  const company = await prisma.company.findUnique({ where: { ownerId: session.id }, select: { id: true } })
  if (!company) return forbidden()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { code, type, value, minOrder, maxUses, expiresAt } = parsed.data

  if (type !== 'FREE_SHIPPING' && (value === undefined || value <= 0)) {
    return badRequest('Informe o valor do desconto')
  }
  if (type === 'DISCOUNT_PERCENT' && value! > 100) {
    return badRequest('Percentual não pode ultrapassar 100%')
  }

  const existing = await prisma.coupon.findUnique({
    where: { companyId_code: { companyId: company.id, code } },
  })
  if (existing) return conflict('Já existe um cupom com esse código')

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type,
      value: value ?? null,
      minOrder: minOrder ?? null,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      companyId: company.id,
    },
  })

  return created(coupon)
}
