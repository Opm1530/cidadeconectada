import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound } from '@/lib/api-response'

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  summary: z.string().max(300).nullable().optional(),
  content: z.string().min(10).optional(),
  imageUrl: z.string().url().nullable().optional(),
  category: z.enum(['GENERAL', 'HEALTH', 'SECURITY', 'EVENTS', 'INFRASTRUCTURE', 'ECONOMY', 'ENVIRONMENT', 'EDUCATION']).optional(),
  audience: z.enum(['MERCHANTS', 'CUSTOMERS', 'ALL']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ newsId: string }> }) {
  const { newsId } = await params
  const news = await prisma.news.findUnique({ where: { id: newsId } })
  if (!news) return notFound('Notícia não encontrada')
  return ok(news)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ newsId: string }> }) {
  const { newsId } = await params
  const session = await getSession()
  if (!session) return forbidden()
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') return forbidden()

  const news = await prisma.news.findUnique({ where: { id: newsId } })
  if (!news) return notFound('Notícia não encontrada')

  if (session.role !== 'SUPER_ADMIN') {
    const isAdmin = await prisma.cityAdmin.findFirst({ where: { cityId: news.cityId, userId: session.id } })
    if (!isAdmin) return forbidden()
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const data: Record<string, unknown> = { ...parsed.data }
  // Define publishedAt quando publicando pela primeira vez
  if (parsed.data.status === 'PUBLISHED' && !news.publishedAt) {
    data.publishedAt = new Date()
  }

  const updated = await prisma.news.update({ where: { id: newsId }, data })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ newsId: string }> }) {
  const { newsId } = await params
  const session = await getSession()
  if (!session) return forbidden()
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') return forbidden()

  const news = await prisma.news.findUnique({ where: { id: newsId } })
  if (!news) return notFound('Notícia não encontrada')

  await prisma.news.delete({ where: { id: newsId } })
  return ok({ deleted: true })
}
