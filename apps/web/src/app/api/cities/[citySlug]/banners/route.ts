import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { ok, notFound } from '@/lib/api-response'

// GET /api/cities/[citySlug]/banners?type=CITY_HERO — banners ativos de uma cidade
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ citySlug: string }> },
) {
  const { citySlug } = await params
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as 'CITY_HERO' | 'HOME_GRID' | 'CART_BANNER' | 'STORE_HERO' | 'PROMO_CAROUSEL' | null

  const city = await prisma.city.findUnique({
    where: { slug: citySlug, active: true },
    select: { id: true },
  })
  if (!city) return notFound('Cidade não encontrada')

  const now = new Date()

  const banners = await prisma.banner.findMany({
    where: {
      cityId: city.id,
      active: true,
      ...(type ? { type } : {}),
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      imageUrl: true,
      title: true,
      subtitle: true,
      link: true,
      type: true,
    },
  })

  return ok(banners)
}
