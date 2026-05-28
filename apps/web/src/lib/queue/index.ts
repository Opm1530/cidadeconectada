import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

// ─── Definição dos Jobs ───

export type NotificationJobData =
  | { type: 'order_created'; orderId: string; companyId: string }
  | { type: 'payment_confirmed'; orderId: string }
  | { type: 'order_status_changed'; orderId: string; status: string }
  | { type: 'driver_approved'; driverId: string }
  | { type: 'delivery_request'; orderId: string; driverId: string }   // notifica entregador de novo pedido
  | { type: 'driver_accepted'; orderId: string; deliveryId: string }  // notifica loja que entregador aceitou
  | { type: 'order_ready'; orderId: string; deliveryId: string }      // notifica entregador que pedido está pronto
  | { type: 'delivery_picked_up'; orderId: string }                   // notifica cliente que saiu para entrega

const connection = redis

// ─── Filas ───

export const notificationQueue = new Queue<NotificationJobData>('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// ─── Helpers para enfileirar jobs ───

export async function queueOrderCreated(orderId: string, companyId: string) {
  await notificationQueue.add('order_created', { type: 'order_created', orderId, companyId })
}

export async function queuePaymentConfirmed(orderId: string) {
  await notificationQueue.add('payment_confirmed', { type: 'payment_confirmed', orderId })
}

export async function queueOrderStatusChanged(orderId: string, status: string) {
  await notificationQueue.add('order_status_changed', {
    type: 'order_status_changed',
    orderId,
    status,
  })
}

export async function queueDriverApproved(driverId: string) {
  await notificationQueue.add('driver_approved', { type: 'driver_approved', driverId })
}

/** Notifica o entregador específico que há um novo pedido aguardando aceite */
export async function queueDeliveryRequest(orderId: string, driverId: string) {
  await notificationQueue.add('delivery_request', { type: 'delivery_request', orderId, driverId })
}

/** Notifica a loja que o entregador aceitou e já pode iniciar o preparo */
export async function queueDriverAccepted(orderId: string, deliveryId: string) {
  await notificationQueue.add('driver_accepted', { type: 'driver_accepted', orderId, deliveryId })
}

/** Notifica o entregador que o pedido está pronto para retirada */
export async function queueOrderReady(orderId: string, deliveryId: string) {
  await notificationQueue.add('order_ready', { type: 'order_ready', orderId, deliveryId })
}

/** Notifica o cliente que o pedido saiu para entrega */
export async function queueDeliveryPickedUp(orderId: string) {
  await notificationQueue.add('delivery_picked_up', { type: 'delivery_picked_up', orderId })
}
