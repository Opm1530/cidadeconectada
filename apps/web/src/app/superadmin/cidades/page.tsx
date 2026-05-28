import { prisma } from '@cc/database'
import { CityManager } from './city-manager'

export default async function SuperAdminCidadesPage() {
  const cities = await prisma.city.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { companies: true, drivers: true } },
      cityAdmins: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cidades</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie todas as cidades da plataforma</p>
      </div>
      <CityManager cities={cities} />
    </div>
  )
}
