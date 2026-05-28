'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import type { Order } from '@cc/shared'
import { formatCurrency, formatDate } from '@cc/shared'
import { OrderStatusBadge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/store/auth'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MyOrdersPage() {
  const params = useParams<{ citySlug: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push(`/login?city=${params.citySlug}`); return }
    api.get<{ data: Order[] }>('/api/orders')
      .then((data) => setOrders((data as any).data ?? []))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <PageSpinner />

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Meus Pedidos</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center gap-3 text-gray-400">
          <ShoppingBag size={48} strokeWidth={1} />
          <p>Você ainda não fez nenhum pedido.</p>
          <Link href={`/${params.citySlug}`}><Button>Explorar lojas</Button></Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/${params.citySlug}/pedido/${order.id}`}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">Pedido #{order.number}</p>
                  <p className="text-xs text-gray-400">{order.company?.name} · {formatDate(order.createdAt)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                </p>
                <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
