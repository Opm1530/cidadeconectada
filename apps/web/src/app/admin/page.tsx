import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { Store, Truck, ShoppingBag, Users, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@cc/shared'
import { OrderStatusBadge } from '@/components/ui/badge'
import { formatDate } from '@cc/shared'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: true },
  })
  if (!cityAdmin) redirect('/')

  const city = cityAdmin.city

  const [companyCount, activeCompanies, pendingCompanies, pendingDrivers, approvedDrivers, recentOrders, totalRevenue] = await Promise.all([
    prisma.company.count({ where: { cityId: city.id } }),
    prisma.company.count({ where: { cityId: city.id, active: true } }),
    prisma.company.count({ where: { cityId: city.id, active: false } }),
    prisma.deliveryDriver.count({ where: { cityId: city.id, status: 'PENDING' } }),
    prisma.deliveryDriver.count({ where: { cityId: city.id, status: 'APPROVED' } }),
    prisma.order.findMany({
      where: { company: { cityId: city.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        company: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),
    prisma.order.aggregate({
      where: {
        company: { cityId: city.id },
        status: { in: ['PAID', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { total: true },
    }),
  ])

  const stats = [
    { label: 'Empresas ativas', value: activeCompanies, of: companyCount, icon: Store, color: 'bg-blue-50 text-blue-600', href: '/admin/empresas' },
    { label: 'Entregadores', value: approvedDrivers, icon: Truck, color: 'bg-green-50 text-green-600', href: '/admin/entregadores' },
    { label: 'Pedidos este mês', value: recentOrders.length, icon: ShoppingBag, color: 'bg-purple-50 text-purple-600', href: '#' },
    { label: 'Receita da cidade', value: formatCurrency(Number(totalRevenue._sum.total ?? 0)), icon: Users, color: 'bg-yellow-50 text-yellow-600', href: '#' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-0.5">{city.name} — {city.state}</p>
      </div>

      {/* Alertas */}
      {(pendingCompanies > 0 || pendingDrivers > 0) && (
        <div className="flex flex-col gap-2">
          {pendingCompanies > 0 && (
            <Link
              href="/admin/empresas?status=inactive"
              className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-yellow-800 hover:bg-yellow-100 transition-colors"
            >
              <AlertTriangle size={18} className="text-yellow-500 shrink-0" />
              <span className="text-sm font-medium">
                {pendingCompanies} empresa{pendingCompanies > 1 ? 's' : ''} aguardando aprovação
              </span>
            </Link>
          )}
          {pendingDrivers > 0 && (
            <Link
              href="/admin/entregadores?status=PENDING"
              className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-800 hover:bg-blue-100 transition-colors"
            >
              <Truck size={18} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium">
                {pendingDrivers} entregador{pendingDrivers > 1 ? 'es' : ''} aguardando aprovação
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
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

      {/* Pedidos recentes da cidade */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-800">Pedidos recentes na cidade</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhum pedido ainda.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.company.name} · #{order.number}
                  </p>
                  <p className="text-xs text-gray-400">{order.customer.name} · {formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
