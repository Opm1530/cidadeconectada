import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, unauthorized, forbidden } from '@/lib/api-response'

// GET /api/superadmin/users — lista todos os usuários
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q') ?? ''
  const role = searchParams.get('role') ?? ''

  const where: Record<string, unknown> = {}
  if (q)    where.OR = [
    { name:  { contains: q, mode: 'insensitive' } },
    { email: { contains: q, mode: 'insensitive' } },
  ]
  if (role) where.role = role

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      city: { select: { id: true, name: true, state: true } },
      company: { select: { id: true, name: true, active: true } },
      _count: { select: { orders: true } },
    },
  })

  return ok(users)
}
