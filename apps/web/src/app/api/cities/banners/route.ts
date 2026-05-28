import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { created, badRequest, forbidden, unauthorized } from '@/lib/api-response'

const BANNER_TYPES = ['CITY_HERO', 'HOME_GRID', 'CART_BANNER', 'STORE_HERO', 'PROMO_CAROUSEL'] as const

const schema = z.object({
  imageUrl: z.string().url(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
  cityId: z.string(),
  order: z.number().int().default(0),
  type: z.enum(BANNER_TYPES).default('CITY_HERO'),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { cityId, link, subtitle, ...rest } = parsed.data

  const isAdmin =
    session.role === 'SUPER_ADMIN' ||
    !!(await prisma.cityAdmin.findFirst({ where: { userId: session.id, cityId } }))
  if (!isAdmin) return forbidden()

  const banner = await prisma.banner.create({
    data: { ...rest, cityId, link: link || null, subtitle: subtitle || null },
  })
  return created(banner)
}
