import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@cc/shared'
import { OrderStatusBadge } from '@/components/ui/badge'
import Link from 'next/link'
import { OrderFilters } from './order-filters'

interface Props {
  searchParams: Promise<{ status?: string }>
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'CREATED', label: 'Novos' },
  { value: 'WAITING_PAYMENT', label: 'Ag. pagamento' },
  { value: 'PAID', label: 'Pagos' },
  { value: 'PREPARING', label: 'Em preparo' },
  { value: 'READY_FOR_PICKUP', label: 'Pronto p/ retirada' },
  { value: 'OUT_FOR_DELIVERY', label: 'Em entrega' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'CANCELLED', label: 'Cancelados' },
]

export default async function OrdersPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { status } = await searchParams
  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) redirect('/dashboard/cadastro')

  const orders = await prisma.order.findMany({
    where: {
      companyId: company.id,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      customer: { select: { name: true, phone: true } },
      items: { select: { id: true } },
      payment: { select: { method: true, status: true } },
      delivery: { select: { status: true, driver: { select: { user: { select: { name: true } } } } } },
    },
  })

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
        <span className="text-sm text-gray-400">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filtros de status */}
      <OrderFilters options={STATUS_OPTIONS} current={status ?? ''} />

      {/* Lista */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400 text-sm">
          Nenhum pedido {status ? 'com este status' : 'ainda'}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/pedidos/${order.id}`}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">#{order.number}</span>
                    <span className="text-gray-500 text-sm truncate">{order.customer.name}</span>
                    {order.customer.phone && (
                      <span className="text-xs text-gray-400">{order.customer.phone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                    <span>{formatDate(order.createdAt)}</span>
                    <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                    {order.delivery?.driver && (
                      <span>Entregador: {order.delivery.driver.user.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <OrderStatusBadge status={order.status} />
                  <span className="font-bold text-gray-900">{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
