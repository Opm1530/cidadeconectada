import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { PollManager } from './poll-manager'

export default async function AdminEnquetesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: {
      city: {
        select: { id: true, name: true, slug: true },
      },
    },
  })
  if (!cityAdmin) redirect('/')

  const polls = await prisma.poll.findMany({
    where: { cityId: cityAdmin.city.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { responses: true, questions: true } },
    },
  })

  const serializedPolls = polls.map((p) => ({
    ...p,
    startsAt: p.startsAt?.toISOString() ?? null,
    endsAt: p.endsAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Enquetes</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Crie enquetes para coletar opiniões de lojistas e clientes de {cityAdmin.city.name}
        </p>
      </div>
      <PollManager city={cityAdmin.city} initialPolls={serializedPolls} />
    </div>
  )
}
