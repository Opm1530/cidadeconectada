import { prisma } from '@cc/database'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Users, ShoppingBag, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

interface Props {
  params: Promise<{ citySlug: string }>
}

export default async function EnquetesPage({ params }: Props) {
  const { citySlug } = await params

  const city = await prisma.city.findUnique({
    where: { slug: citySlug, active: true },
    select: { id: true, name: true, slug: true },
  })
  if (!city) notFound()

  const polls = await prisma.poll.findMany({
    where: {
      cityId: city.id,
      status: { in: ['ACTIVE', 'CLOSED'] },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { responses: true } },
    },
  })

  const active = polls.filter((p) => p.status === 'ACTIVE')
  const closed = polls.filter((p) => p.status === 'CLOSED')

  const audienceIcon = (aud: string) => {
    if (aud === 'MERCHANTS') return <ShoppingBag size={13} />
    return <Users size={13} />
  }

  const audienceLabel = (aud: string) => {
    if (aud === 'MERCHANTS') return 'Lojistas'
    if (aud === 'CUSTOMERS') return 'Clientes'
    return 'Todos'
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <BarChart3 size={20} className="text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enquetes</h1>
          <p className="text-sm text-gray-400">Participe e faça sua voz ser ouvida em {city.name}</p>
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma enquete disponível no momento.</p>
          <p className="text-xs mt-1 text-gray-300">Volte em breve para ver novidades.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Abertas</h2>
              <div className="flex flex-col gap-3">
                {active.map((poll) => (
                  <Link
                    key={poll.id}
                    href={`/${citySlug}/enquetes/${poll.id}`}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-primary-200 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                      <BarChart3 size={18} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                        {poll.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          {audienceIcon(poll.audience)}
                          {audienceLabel(poll.audience)}
                        </span>
                        <span className="text-xs text-gray-400">{poll._count.responses} resposta{poll._count.responses !== 1 ? 's' : ''}</span>
                        {poll.endsAt && (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <Clock size={11} />
                            até {new Date(poll.endsAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full shrink-0">
                      Votar
                    </span>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Encerradas</h2>
              <div className="flex flex-col gap-3">
                {closed.map((poll) => (
                  <Link
                    key={poll.id}
                    href={`/${citySlug}/enquetes/${poll.id}`}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 hover:shadow-sm transition-all group opacity-75"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={18} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-700 truncate">{poll.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          {audienceIcon(poll.audience)}
                          {audienceLabel(poll.audience)}
                        </span>
                        <span className="text-xs text-gray-400">{poll._count.responses} resposta{poll._count.responses !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">Ver resultado</span>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
