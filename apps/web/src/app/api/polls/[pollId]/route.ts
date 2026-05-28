import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound } from '@/lib/api-response'

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().nullable().optional(),
  audience: z.enum(['MERCHANTS', 'CUSTOMERS', 'ALL']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
})

// GET /api/polls/[pollId] — detalhes da enquete com perguntas e resultados
export async function GET(_req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
            include: { _count: { select: { answers: true } } },
          },
          _count: { select: { answers: true } },
        },
      },
      _count: { select: { responses: true } },
    },
  })

  if (!poll) return notFound('Enquete não encontrada')
  return ok(poll)
}

// PATCH /api/polls/[pollId] — atualiza status/dados (somente admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params
  const session = await getSession()
  if (!session) return forbidden()
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') return forbidden()

  const poll = await prisma.poll.findUnique({ where: { id: pollId } })
  if (!poll) return notFound('Enquete não encontrada')

  // Verifica se é admin desta cidade
  if (session.role !== 'SUPER_ADMIN') {
    const isAdmin = await prisma.cityAdmin.findFirst({
      where: { cityId: poll.cityId, userId: session.id },
    })
    if (!isAdmin) return forbidden()
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const updated = await prisma.poll.update({ where: { id: pollId }, data: parsed.data })
  return ok(updated)
}

// DELETE /api/polls/[pollId] — exclui enquete (somente admin, só se DRAFT)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params
  const session = await getSession()
  if (!session) return forbidden()
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') return forbidden()

  const poll = await prisma.poll.findUnique({ where: { id: pollId } })
  if (!poll) return notFound('Enquete não encontrada')
  if (poll.status !== 'DRAFT') return badRequest('Apenas enquetes em rascunho podem ser excluídas')

  await prisma.poll.delete({ where: { id: pollId } })
  return ok({ deleted: true })
}
