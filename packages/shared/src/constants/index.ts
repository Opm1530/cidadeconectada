export const ORDER_STATUS_LABEL: Record<string, string> = {
  CREATED: 'Pedido criado',
  WAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PREPARING: 'Em preparo',
  READY_FOR_PICKUP: 'Pronto para retirada',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  MERCADO_PAGO: 'Mercado Pago',
  PIX: 'Pix',
  CASH_ON_DELIVERY: 'Pagamento na entrega',
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  FAILED: 'Falhou',
  REFUNDED: 'Estornado',
}

export const DRIVER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
}

export const DELIVERY_TYPE_LABEL: Record<string, string> = {
  PICKUP: 'Retirada no local',
  OWN_DELIVERY: 'Entrega pela loja',
  PLATFORM_DRIVER: 'Entregador da plataforma',
}

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando entregador',
  ACCEPTED: 'Entregador a caminho',
  PICKED_UP: 'Produto coletado',
  DELIVERED: 'Entregue',
  FAILED: 'Falha na entrega',
}

export const ITEMS_PER_PAGE = 20
