import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { ok, notFound } from '@/lib/api-response'

// GET /api/cities/[citySlug]/drivers?active=true — entregadores ativos da cidade
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ citySlug: string }> },
) {
  const { citySlug } = await params

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true },
  })
  if (!city) return notFound('Cidade não encontrada')

  const drivers = await prisma.deliveryDriver.findMany({
    where: {
      cityId: city.id,
      status: 'APPROVED',
      active: true,
    },
    select: {
      id: true,
      deliveryFee: true,
      vehicle: true,
      user: { select: { name: true } },
    },
    orderBy: { deliveryFee: 'asc' },
  })

  return ok(drivers)
}
