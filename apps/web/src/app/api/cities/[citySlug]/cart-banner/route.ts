import { NextResponse } from 'next/server'
import { prisma } from '@cc/database'

export async function GET(_req: Request, { params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params

  const city = await prisma.city.findUnique({ where: { slug: citySlug }, select: { id: true } })
  if (!city) return NextResponse.json(null)

  const now = new Date()
  const banner = await prisma.banner.findFirst({
    where: {
      cityId: city.id,
      type: 'CART_BANNER',
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { order: 'asc' },
    select: { id: true, imageUrl: true, title: true, subtitle: true, link: true },
  })

  return NextResponse.json(banner)
}
