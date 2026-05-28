import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound } from '@/lib/api-response'

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT']),
  required: z.boolean().default(true),
  order: z.number().int().default(0),
  options: z.array(z.object({
    text: z.string().min(1),
    order: z.number().int().default(0),
  })).optional(),
})

const createSchema = z.object({
  title: z.string().min(3, 'Título muito curto'),
  description: z.string().optional(),
  audience: z.enum(['MERCHANTS', 'CUSTOMERS', 'ALL']).default('ALL'),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  questions: z.array(questionSchema).min(1, 'Adicione pelo menos uma pergunta'),
})

// GET /api/polls?citySlug=...&status=ACTIVE — lista enquetes de uma cidade
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const citySlug = searchParams.get('citySlug')
  const status = searchParams.get('status') // DRAFT | ACTIVE | CLOSED | ALL

  if (!citySlug) return badRequest('citySlug obrigatório')

  const city = await prisma.city.findUnique({ where: { slug: citySlug }, select: { id: true } })
  if (!city) return notFound('Cidade não encontrada')

  const polls = await prisma.poll.findMany({
    where: {
      cityId: city.id,
      ...(status && status !== 'ALL' ? { status: status as 'DRAFT' | 'ACTIVE' | 'CLOSED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { responses: true, questions: true } },
    },
  })

  return ok({ data: polls, total: polls.length })
}

// POST /api/polls — cria nova enquete (somente admin da cidade)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return forbidden()
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') return forbidden()

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: { select: { id: true } } },
  })
  if (!cityAdmin && session.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { questions, ...pollData } = parsed.data

  const cityId = cityAdmin?.city.id ?? body.cityId
  if (!cityId) return badRequest('cityId obrigatório')

  const poll = await prisma.poll.create({
    data: {
      ...pollData,
      cityId,
      status: 'DRAFT',
      questions: {
        create: questions.map((q) => ({
          text: q.text,
          type: q.type,
          required: q.required,
          order: q.order,
          options: q.options ? {
            create: q.options.map((o) => ({ text: o.text, order: o.order })),
          } : undefined,
        })),
      },
    },
    include: {
      questions: { include: { options: true } },
    },
  })

  return ok(poll)
}
