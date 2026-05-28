import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound } from '@/lib/api-response'

const voteSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    optionId: z.string().optional().nullable(),
    textAnswer: z.string().optional().nullable(),
  })).min(1),
})

// POST /api/polls/[pollId]/vote — registra voto do usuário
export async function POST(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params
  const session = await getSession()
  if (!session) return forbidden('Faça login para votar')

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { questions: { include: { options: true } } },
  })
  if (!poll) return notFound('Enquete não encontrada')
  if (poll.status !== 'ACTIVE') return badRequest('Esta enquete não está ativa')

  // Valida público-alvo
  if (poll.audience === 'MERCHANTS' && session.role !== 'COMPANY_OWNER') {
    return forbidden('Esta enquete é exclusiva para lojistas')
  }
  if (poll.audience === 'CUSTOMERS' && session.role !== 'CUSTOMER') {
    return forbidden('Esta enquete é exclusiva para clientes')
  }

  // Verifica se já votou
  const existing = await prisma.pollResponse.findUnique({
    where: { pollId_userId: { pollId, userId: session.id } },
  })
  if (existing) return badRequest('Você já votou nesta enquete')

  const body = await req.json()
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const response = await prisma.pollResponse.create({
    data: {
      pollId,
      userId: session.id,
      answers: {
        create: parsed.data.answers.map((a) => ({
          questionId: a.questionId,
          optionId: a.optionId ?? null,
          textAnswer: a.textAnswer ?? null,
        })),
      },
    },
  })

  return ok(response)
}

// GET /api/polls/[pollId]/vote — verifica se usuário já votou
export async function GET(_req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params
  const session = await getSession()
  if (!session) return ok({ voted: false })

  const existing = await prisma.pollResponse.findUnique({
    where: { pollId_userId: { pollId, userId: session.id } },
  })
  return ok({ voted: !!existing })
}
