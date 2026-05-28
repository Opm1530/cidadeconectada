'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ORDER_STATUS_LABEL } from '@cc/shared'
import { CheckCircle2, QrCode, ChefHat, Truck, Package, X } from 'lucide-react'

interface OrderActionsProps {
  orderId: string
  available: string[]
  deliveryType: string
  canConfirmPix: boolean
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PREPARING:        <ChefHat size={15} />,
  READY_FOR_PICKUP: <Package size={15} />,
  OUT_FOR_DELIVERY: <Truck size={15} />,
  DELIVERED:        <CheckCircle2 size={15} />,
  CANCELLED:        <X size={15} />,
}

export function OrderActions({ orderId, available, deliveryType, canConfirmPix }: OrderActionsProps) {
  const deliveredLabel =
    deliveryType === 'PICKUP'        ? '✅ Confirmar retirada' :
    deliveryType === 'OWN_DELIVERY'  ? '📦 Confirmar entrega'  :
    'Confirmar entrega'

  const STATUS_LABELS: Record<string, string> = {
    ...ORDER_STATUS_LABEL,
    PREPARING:        'Iniciar preparo',
    READY_FOR_PICKUP: 'Marcar como pronto',
    OUT_FOR_DELIVERY: '🛵 Saiu para entrega',
    DELIVERED:        deliveredLabel,
    CANCELLED:        'Cancelar pedido',
  }

  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setLoading(status)
    try {
      await api.patch(`/api/orders/${orderId}`, { status })
      toast.success(`Pedido atualizado: ${ORDER_STATUS_LABEL[status]}`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setLoading(null)
    }
  }

  async function confirmPix() {
    setLoading('pix')
    try {
      await api.patch(`/api/orders/${orderId}`, { action: 'confirm_payment' })
      toast.success('Pagamento Pix confirmado!')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao confirmar')
    } finally {
      setLoading(null)
    }
  }

  if (available.length === 0 && !canConfirmPix) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-800 mb-3">Ações</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {canConfirmPix && (
          <Button
            onClick={confirmPix}
            loading={loading === 'pix'}
            variant="primary"
            className="gap-2"
          >
            <QrCode size={16} />
            Confirmar pagamento Pix
          </Button>
        )}

        {available.map((status) => (
          <Button
            key={status}
            onClick={() => updateStatus(status)}
            loading={loading === status}
            variant={status === 'CANCELLED' ? 'danger' : status === 'PREPARING' ? 'primary' : 'secondary'}
            className="gap-2"
          >
            {STATUS_ICON[status]}
            {STATUS_LABELS[status] ?? status}
          </Button>
        ))}
      </div>
    </div>
  )
}
