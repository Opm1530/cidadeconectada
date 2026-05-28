import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden } from '@/lib/api-response'

// GET /api/superadmin/companies — lista todas as empresas de todas as cidades
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q') ?? ''
  const cityId = searchParams.get('cityId') ?? ''
  const status = searchParams.get('status') ?? ''

  const where: Record<string, unknown> = {}
  if (q)      where.name   = { contains: q, mode: 'insensitive' }
  if (cityId) where.cityId = cityId
  if (status === 'active')   where.active = true
  if (status === 'inactive') where.active = false

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, slug: true, category: true, active: true, createdAt: true,
      city: { select: { id: true, name: true, state: true } },
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { orders: true, products: true } },
    },
  })

  return ok(companies)
}
