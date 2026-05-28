import { cn } from '@/lib/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    CREATED: { label: 'Criado', variant: 'default' },
    WAITING_PAYMENT: { label: 'Aguardando pagamento', variant: 'warning' },
    PAID: { label: 'Pago', variant: 'info' },
    PREPARING: { label: 'Em preparo', variant: 'info' },
    READY_FOR_PICKUP: { label: 'Pronto para retirada', variant: 'warning' },
    OUT_FOR_DELIVERY: { label: 'Saiu para entrega', variant: 'info' },
    DELIVERED: { label: 'Entregue', variant: 'success' },
    CANCELLED: { label: 'Cancelado', variant: 'danger' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
