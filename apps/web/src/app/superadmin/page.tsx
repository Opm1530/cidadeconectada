import { prisma } from '@cc/database'
import { Globe, Users, Store, Truck } from 'lucide-react'
import Link from 'next/link'

export default async function SuperAdminPage() {
  const [totalCities, activeCities, totalCompanies, totalDrivers] = await Promise.all([
    prisma.city.count(),
    prisma.city.count({ where: { active: true } }),
    prisma.company.count(),
    prisma.deliveryDriver.count({ where: { status: 'APPROVED' } }),
  ])

  const recentCities = await prisma.city.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      _count: { select: { companies: true, drivers: true } },
    },
  })

  const stats = [
    { label: 'Cidades ativas', value: activeCities, of: totalCities, icon: Globe, color: 'bg-blue-50 text-blue-600', href: '/superadmin/cidades' },
    { label: 'Empresas cadastradas', value: totalCompanies, icon: Store, color: 'bg-purple-50 text-purple-600', href: '/superadmin/cidades' },
    { label: 'Entregadores aprovados', value: totalDrivers, icon: Truck, color: 'bg-green-50 text-green-600', href: '/superadmin/cidades' },
    { label: 'Administradores', value: '-', icon: Users, color: 'bg-yellow-50 text-yellow-600', href: '/superadmin/admins' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-0.5">Painel de controle global</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.of !== undefined && (
                <p className="text-xs text-gray-400">de {stat.of} total</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Cidades recentes</h2>
          <Link href="/superadmin/cidades" className="text-xs text-primary-600 hover:underline">Ver todas</Link>
        </div>
        {recentCities.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhuma cidade cadastrada.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentCities.map((city) => (
              <div key={city.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{city.name} — {city.state}</p>
                  <p className="text-xs text-gray-400">{city._count.companies} empresas · {city._count.drivers} entregadores</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${city.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {city.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
