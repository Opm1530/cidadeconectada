import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound } from '@/lib/api-response'

const createSchema = z.object({
  title: z.string().min(3, 'Título muito curto'),
  summary: z.string().max(300).optional(),
  content: z.string().min(10, 'Conteúdo muito curto'),
  imageUrl: z.string().url().optional().nullable(),
  category: z.enum(['GENERAL', 'HEALTH', 'SECURITY', 'EVENTS', 'INFRASTRUCTURE', 'ECONOMY', 'ENVIRONMENT', 'EDUCATION']).default('GENERAL'),
  audience: z.enum(['MERCHANTS', 'CUSTOMERS', 'ALL']).default('ALL'),
})

// GET /api/news?citySlug=...&status=PUBLISHED — lista notícias
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const citySlug = searchParams.get('citySlug')
  const status = searchParams.get('status') ?? 'PUBLISHED'

  if (!citySlug) return badRequest('citySlug obrigatório')

  const city = await prisma.city.findUnique({ where: { slug: citySlug }, select: { id: true } })
  if (!city) return notFound('Cidade não encontrada')

  const news = await prisma.news.findMany({
    where: {
      cityId: city.id,
      status: status === 'ALL' ? undefined : (status as 'DRAFT' | 'PUBLISHED'),
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true, title: true, summary: true, imageUrl: true,
      category: true, audience: true, status: true,
      publishedAt: true, createdAt: true,
    },
  })

  return ok(news)
}

// POST /api/news — cria notícia (admin da cidade)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return forbidden()
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') return forbidden()

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: { select: { id: true } } },
  })
  if (!cityAdmin) return forbidden()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const news = await prisma.news.create({
    data: {
      ...parsed.data,
      cityId: cityAdmin.city.id,
      status: 'DRAFT',
    },
  })

  return ok(news)
}
