import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@cc/shared'
import { ShoppingBag, DollarSign, Clock, CheckCircle2, Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/ui/badge'
import { formatDate } from '@cc/shared'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) redirect('/dashboard/cadastro')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todayOrders, pendingOrders, totalRevenue, productCount, recentOrders] = await Promise.all([
    // Pedidos de hoje
    prisma.order.count({ where: { companyId: company.id, createdAt: { gte: today } } }),

    // Pedidos aguardando ação (criados, pagos, em preparo)
    prisma.order.count({
      where: { companyId: company.id, status: { in: ['CREATED', 'WAITING_PAYMENT', 'PAID', 'PREPARING'] } },
    }),

    // Receita do mês
    prisma.order.aggregate({
      where: {
        companyId: company.id,
        status: { in: ['PAID', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
        createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum: { total: true },
    }),

    // Total de produtos ativos
    prisma.product.count({ where: { companyId: company.id, active: true } }),

    // Últimos 5 pedidos
    prisma.order.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ])

  const stats = [
    { label: 'Pedidos hoje', value: todayOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Aguardando ação', value: pendingOrders, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Receita do mês', value: formatCurrency(Number(totalRevenue._sum.total ?? 0)), icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Produtos ativos', value: productCount, icon: Package, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-0.5">{company.name}</p>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Alerta de empresa inativa */}
      {!company.active && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Sua empresa está <strong>inativa</strong>. Entre em contato com o administrador da cidade para ativar.</span>
        </div>
      )}

      {/* Pedidos recentes */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-800">Pedidos recentes</h2>
          <Link href="/dashboard/pedidos" className="text-xs text-primary-600 hover:underline">
            Ver todos
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhum pedido ainda.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/pedidos/${order.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{order.number} · {order.customer.name}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(order.total))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      {pendingOrders > 0 && (
        <Link
          href="/dashboard/pedidos?status=PAID"
          className="flex items-center gap-3 bg-primary-600 text-white rounded-xl px-5 py-4 hover:bg-primary-700 transition-colors"
        >
          <CheckCircle2 size={20} />
          <div>
            <p className="font-semibold">
              {pendingOrders} {pendingOrders === 1 ? 'pedido aguarda' : 'pedidos aguardam'} sua ação
            </p>
            <p className="text-xs text-primary-200">Clique para gerenciar</p>
          </div>
        </Link>
      )}
    </div>
  )
}
