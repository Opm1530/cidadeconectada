'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { Order } from '@cc/shared'
import { formatCurrency, formatDate, ORDER_STATUS_LABEL, DELIVERY_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '@cc/shared'
import { OrderStatusBadge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { CheckCircle2, Clock, ChefHat, Bike, PackageCheck, QrCode, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

// Steps variam conforme o tipo de entrega
const STEPS_DELIVERY = [
  { key: 'CREATED',          label: 'Pedido recebido',         icon: Clock },
  { key: 'PAID',             label: 'Pagamento confirmado',     icon: CheckCircle2 },
  { key: 'PREPARING',        label: 'Em preparo',               icon: ChefHat },
  { key: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega',        icon: Bike },
  { key: 'DELIVERED',        label: 'Entregue!',                icon: PackageCheck },
]

const STEPS_PICKUP = [
  { key: 'CREATED',          label: 'Pedido recebido',          icon: Clock },
  { key: 'PAID',             label: 'Pagamento confirmado',      icon: CheckCircle2 },
  { key: 'PREPARING',        label: 'Em preparo',                icon: ChefHat },
  { key: 'READY_FOR_PICKUP', label: 'Pronto para retirada!',     icon: PackageCheck },
  { key: 'DELIVERED',        label: 'Retirado',                  icon: CheckCircle2 },
]

export default function OrderPage() {
  const params = useParams<{ citySlug: string; orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrder() {
    try {
      const data = await api.get<Order>(`/api/orders/${params.orderId}`)
      setOrder(data)
    } catch {
      router.push(`/${params.citySlug}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    // Polling a cada 15 segundos para atualizar o status
    const interval = setInterval(fetchOrder, 15_000)
    return () => clearInterval(interval)
  }, [params.orderId])

  if (loading) return <PageSpinner />
  if (!order) return null

  const isPickup = order.deliveryType === 'PICKUP'
  const STATUS_STEPS = isPickup ? STEPS_PICKUP : STEPS_DELIVERY

  // READY_FOR_PICKUP conta como step 3 no fluxo de retirada
  const statusKey = isPickup && order.status === 'READY_FOR_PICKUP' ? 'READY_FOR_PICKUP' : order.status
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === statusKey)
  const isCancelled = order.status === 'CANCELLED'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header do pedido */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Pedido #{order.number}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
            {order.company && (
              <p className="text-sm text-gray-600 mt-1">{order.company.name}</p>
            )}
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Progress steps */}
      {!isCancelled && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Acompanhamento</h2>
          <div className="relative">
            {/* Linha conectando os steps */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
            <div
              className="absolute left-4 top-4 w-0.5 bg-primary-500 transition-all"
              style={{ height: `${Math.min(currentStepIdx, STATUS_STEPS.length - 1) / (STATUS_STEPS.length - 1) * 100}%` }}
            />

            <div className="flex flex-col gap-5">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx <= currentStepIdx
                const isCurrent = idx === currentStepIdx
                const Icon = step.icon
                return (
                  <div key={step.key} className="flex items-center gap-4 relative">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors',
                      isDone ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400',
                    )}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className={cn('text-sm', isDone ? 'font-medium text-gray-900' : 'text-gray-400')}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-primary-600 animate-pulse">Em andamento...</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center font-medium">
          Este pedido foi cancelado.
        </div>
      )}

      {/* Código de confirmação (Pix ou entregador) */}
      {order.delivery && order.delivery.status !== 'DELIVERED' && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
          <QrCode size={24} className="text-primary-600 mx-auto mb-2" />
          <p className="text-xs text-primary-700 font-medium mb-1">
            Código de confirmação da entrega
          </p>
          <p className="text-3xl font-bold tracking-[0.3em] text-primary-700">
            {order.delivery.confirmationCode}
          </p>
          <p className="text-xs text-primary-500 mt-1">
            Mostre este código ao entregador
          </p>
        </div>
      )}

      {/* Pagamento Pix */}
      {order.payment?.method === 'PIX' && order.payment.status === 'PENDING' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
            <QrCode size={16} /> Pagamento via Pix
          </h3>
          <p className="text-sm text-purple-700">
            Chave Pix: <strong>{order.payment.pixKey}</strong>
          </p>
          <p className="text-xs text-purple-500 mt-1">
            Após pagar, a loja confirmará o pagamento.
          </p>
          {order.company?.whatsapp && (
            <a
              href={`https://wa.me/55${order.company.whatsapp.replace(/\D/g, '')}?text=Olá! Realizei o pagamento do pedido %23${order.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600"
            >
              <MessageCircle size={13} />
              Confirmar via WhatsApp
            </a>
          )}
        </div>
      )}

      {/* Itens do pedido */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Itens</h2>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.quantity}x {item.productName}
                </p>
                {item.options.length > 0 && (
                  <p className="text-xs text-gray-400">{item.options.map((o) => o.name).join(', ')}</p>
                )}
                {item.notes && <p className="text-xs text-gray-400 italic">"{item.notes}"</p>}
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Resumo</h2>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Entrega</span>
            <span>{DELIVERY_TYPE_LABEL[order.deliveryType]}</span>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between text-gray-600">
              <span>Endereço</span>
              <span className="text-right max-w-[180px]">{order.deliveryAddress}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Pagamento</span>
            <span>{PAYMENT_METHOD_LABEL[order.payment?.method ?? ''] ?? '—'}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Taxa de entrega</span>
              <span>{formatCurrency(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 mt-1">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
