import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { NeighborhoodManager } from './neighborhood-manager'

export default async function AdminNeighborhoodsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: {
      city: {
        include: { neighborhoods: { orderBy: { name: 'asc' } } },
      },
    },
  })
  if (!cityAdmin) redirect('/')

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin size={20} className="text-primary-600" />
          Bairros
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {cityAdmin.city.neighborhoods.length} bairro{cityAdmin.city.neighborhoods.length !== 1 ? 's' : ''} cadastrado{cityAdmin.city.neighborhoods.length !== 1 ? 's' : ''}
        </p>
      </div>

      <NeighborhoodManager
        cityId={cityAdmin.city.id}
        initialNeighborhoods={cityAdmin.city.neighborhoods.map((n) => ({ id: n.id, name: n.name }))}
      />
    </div>
  )
}
