import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, forbidden } from '@/lib/api-response'

const createSchema = z.object({
  name: z.string().min(2),
  state: z.string().length(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras, números e hífens'),
  maxDrivers: z.number().int().positive().optional(),
})

export async function GET() {
  const cities = await prisma.city.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      state: true,
      slug: true,
      active: true,
      createdAt: true,
      _count: { select: { companies: { where: { active: true } } } },
    },
  })
  return ok(cities)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { name, state, slug, maxDrivers } = parsed.data

  const city = await prisma.city.create({ data: { name, state, slug, maxDrivers } })
  return created(city)
}
