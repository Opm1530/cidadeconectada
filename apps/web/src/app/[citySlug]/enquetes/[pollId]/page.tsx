import { prisma } from '@cc/database'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { PollVoter } from './poll-voter'

interface Props {
  params: Promise<{ citySlug: string; pollId: string }>
}

export default async function PollPage({ params }: Props) {
  const { citySlug, pollId } = await params
  const session = await getSession()

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      city: { select: { id: true, name: true, slug: true } },
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

  if (!poll || poll.city.slug !== citySlug) notFound()
  if (poll.status === 'DRAFT') notFound()

  // Verifica se o usuário já votou
  let hasVoted = false
  if (session) {
    const existing = await prisma.pollResponse.findUnique({
      where: { pollId_userId: { pollId, userId: session.id } },
    })
    hasVoted = !!existing
  }

  const totalResponses = poll._count.responses

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PollVoter
        poll={{
          id: poll.id,
          title: poll.title,
          description: poll.description,
          audience: poll.audience,
          status: poll.status,
          endsAt: poll.endsAt?.toISOString() ?? null,
          totalResponses,
          questions: poll.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            required: q.required,
            totalAnswers: q._count.answers,
            options: q.options.map((o) => ({
              id: o.id,
              text: o.text,
              count: o._count.answers,
            })),
          })),
        }}
        citySlug={citySlug}
        hasVoted={hasVoted}
        isLoggedIn={!!session}
      />
    </div>
  )
}
