import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate, PAYMENT_METHOD_LABEL, DELIVERY_TYPE_LABEL } from '@cc/shared'
import { OrderStatusBadge } from '@/components/ui/badge'
import { OrderActions } from './order-actions'

interface Props {
  params: Promise<{ orderId: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { orderId } = await params
  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) redirect('/dashboard/cadastro')

  const order = await prisma.order.findUnique({
    where: { id: orderId, companyId: company.id },
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      items: {
        include: {
          options: true,
          product: { select: { name: true } },
        },
      },
      payment: true,
      delivery: {
        include: { driver: { include: { user: { select: { name: true, phone: true } } } } },
      },
    },
  })

  if (!order) notFound()

  const deliveryType = order.deliveryType

  const nextStatuses: Record<string, string[]> = {
    CREATED:          ['PREPARING', 'CANCELLED'],
    WAITING_PAYMENT:  ['CANCELLED'],
    PAID:             ['PREPARING', 'CANCELLED'],
    PREPARING:        ['READY_FOR_PICKUP'],
    // PLATFORM_DRIVER: entregador retira e confirma com código — lojista não faz nada
    // OWN_DELIVERY: lojista marca "saiu para entrega" e depois confirma entregue
    // PICKUP: lojista confirma retirada diretamente
    READY_FOR_PICKUP:
      deliveryType === 'PLATFORM_DRIVER' ? [] :
      deliveryType === 'OWN_DELIVERY'    ? ['OUT_FOR_DELIVERY'] :
      /* PICKUP */                          ['DELIVERED'],
    OUT_FOR_DELIVERY: deliveryType === 'OWN_DELIVERY' ? ['DELIVERED'] : [], // PLATFORM_DRIVER confirma com código
    DELIVERED:        [],
    CANCELLED:        [],
  }

  const available = nextStatuses[order.status] ?? []

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pedido #{order.number}</h1>
          <p className="text-sm text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Ações de status */}
      <OrderActions orderId={order.id} available={available} deliveryType={deliveryType} canConfirmPix={order.payment?.method === 'PIX' && order.payment?.status === 'PENDING'} />

      {/* Cliente */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Cliente</h2>
        <div className="text-sm text-gray-600 flex flex-col gap-1">
          <p><span className="text-gray-400">Nome:</span> {order.customer.name}</p>
          {order.customer.phone && (
            <p>
              <span className="text-gray-400">Telefone:</span>{' '}
              <a href={`tel:${order.customer.phone}`} className="text-primary-600 hover:underline">
                {order.customer.phone}
              </a>
              {' · '}
              <a
                href={`https://wa.me/55${order.customer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                WhatsApp
              </a>
            </p>
          )}
          {order.customer.email && <p><span className="text-gray-400">Email:</span> {order.customer.email}</p>}
        </div>
      </div>

      {/* Entrega */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Entrega</h2>
        <div className="text-sm text-gray-600 flex flex-col gap-1">
          <p><span className="text-gray-400">Tipo:</span> {DELIVERY_TYPE_LABEL[order.deliveryType]}</p>
          {order.deliveryAddress && <p><span className="text-gray-400">Endereço:</span> {order.deliveryAddress}</p>}
          {order.delivery?.driver && (
            <p>
              <span className="text-gray-400">Entregador:</span>{' '}
              {order.delivery.driver.user.name}
              {order.delivery.driver.user.phone && (
                <>
                  {' · '}
                  <a
                    href={`https://wa.me/55${order.delivery.driver.user.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    WhatsApp
                  </a>
                </>
              )}
            </p>
          )}
          {order.delivery && (
            <p><span className="text-gray-400">Código de confirmação:</span>{' '}
              <strong className="tracking-widest">{order.delivery.confirmationCode}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Pagamento */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Pagamento</h2>
        <div className="text-sm text-gray-600 flex flex-col gap-1">
          <p><span className="text-gray-400">Método:</span> {PAYMENT_METHOD_LABEL[order.payment?.method ?? ''] ?? '—'}</p>
          <p>
            <span className="text-gray-400">Status:</span>{' '}
            <span className={order.payment?.status === 'CONFIRMED' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
              {order.payment?.status === 'CONFIRMED' ? 'Confirmado' : order.payment?.status === 'PENDING' ? 'Pendente' : order.payment?.status}
            </span>
          </p>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Itens do pedido</h2>
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
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(item.totalPrice))}</p>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Observação: <span className="italic">{order.notes}</span></p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(Number(order.subtotal))}</span>
          </div>
          {Number(order.deliveryFee) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Taxa de entrega</span>
              <span>{formatCurrency(Number(order.deliveryFee))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-1">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
