import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { NewsManager } from './news-manager'

export default async function AdminNoticiasPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: { select: { id: true, name: true, slug: true } } },
  })
  if (!cityAdmin) redirect('/')

  const news = await prisma.news.findMany({
    where: { cityId: cityAdmin.city.id },
    orderBy: { createdAt: 'desc' },
  })

  const serializedNews = news.map((n) => ({
    ...n,
    publishedAt: n.publishedAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notícias e Comunicados</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Publique informações, campanhas e comunicados para lojistas e clientes de {cityAdmin.city.name}
        </p>
      </div>
      <NewsManager city={cityAdmin.city} initialNews={serializedNews} />
    </div>
  )
}
