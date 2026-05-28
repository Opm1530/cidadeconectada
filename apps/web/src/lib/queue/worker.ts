/**
 * Worker de notificações — processa jobs da fila em background.
 * Em produção, iniciar com: node src/lib/queue/worker.js
 * (ou via pm2 / docker-compose como serviço separado)
 */
import { Worker } from 'bullmq'
import { redis } from '@/lib/redis'
import { prisma } from '@cc/database'
import type { NotificationJobData } from './index'
import { sendWhatsApp } from '@/lib/whatsapp'
import { ORDER_STATUS_LABEL } from '@cc/shared'

// ─── Expo Push API ────────────────────────────────────────────────────────────

async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  if (!pushToken.startsWith('ExponentPushToken[')) return

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default', priority: 'high' }),
    })
  } catch (err) {
    console.error('[Push] Erro ao enviar notificação Expo:', err)
  }
}

async function pushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true, phone: true, name: true } })
  if (user?.pushToken) await sendExpoPush(user.pushToken, title, body, data)
}

// ─── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker<NotificationJobData>(
  'notifications',
  async (job) => {
    const { data } = job

    switch (data.type) {

      // ── Pedido criado (para PICKUP / OWN_DELIVERY) ─────────────────────────
      case 'order_created': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: { company: { include: { owner: true } }, customer: true, items: true },
        })
        if (!order) return

        // Push para o dono da loja
        if (order.company.owner?.pushToken) {
          await sendExpoPush(
            order.company.owner.pushToken,
            '🛍️ Novo pedido!',
            `Pedido #${order.number} de ${order.customer.name} — R$ ${Number(order.total).toFixed(2)}`,
            { orderId: order.id, screen: 'lojista-pedidos' },
          )
        }

        // WhatsApp fallback
        if (order.company.whatsapp && order.company.evolutionApiInstance) {
          await sendWhatsApp(
            order.company.evolutionApiInstance,
            order.company.evolutionApiKey ?? '',
            order.company.whatsapp,
            `🛍️ *Novo pedido #${order.number}!*\n` +
              `Cliente: ${order.customer.name}\n` +
              `Total: R$ ${Number(order.total).toFixed(2)}\n` +
              `Acesse o app para confirmar.`,
          ).catch(() => {})
        }
        break
      }

      // ── Nova solicitação de entrega para o entregador ──────────────────────
      case 'delivery_request': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: { company: { select: { name: true } }, customer: { select: { name: true } } },
        })
        const driver = await prisma.deliveryDriver.findUnique({
          where: { id: data.driverId },
          select: { user: { select: { pushToken: true } }, deliveryFee: true },
        })
        if (!order || !driver?.user?.pushToken) return

        await sendExpoPush(
          driver.user.pushToken,
          '📦 Nova entrega disponível!',
          `${order.company.name} · R$ ${Number(driver.deliveryFee).toFixed(2)} de frete`,
          { orderId: order.id, screen: 'entregas' },
        )
        break
      }

      // ── Entregador aceitou → notifica loja ────────────────────────────────
      case 'driver_accepted': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: {
            company: { include: { owner: true } },
            customer: true,
            delivery: { include: { driver: { include: { user: true } } } },
          },
        })
        if (!order) return

        const driverName = order.delivery?.driver?.user?.name ?? 'Entregador'

        // Push para o dono da loja
        if (order.company.owner?.pushToken) {
          await sendExpoPush(
            order.company.owner.pushToken,
            '🏍️ Entregador confirmado!',
            `${driverName} aceitou o pedido #${order.number}. Pode iniciar o preparo!`,
            { orderId: order.id, screen: 'lojista-pedidos' },
          )
        }

        // Push para o cliente
        await pushToUser(
          order.customerId,
          '✅ Entregador a caminho!',
          `${driverName} irá buscar seu pedido em ${order.company.name}`,
          { orderId: order.id, screen: 'pedidos' },
        )

        // WhatsApp fallback para loja
        if (order.company.whatsapp && order.company.evolutionApiInstance) {
          await sendWhatsApp(
            order.company.evolutionApiInstance,
            order.company.evolutionApiKey ?? '',
            order.company.whatsapp,
            `🏍️ *${driverName} aceitou o pedido #${order.number}!*\nPode iniciar o preparo.`,
          ).catch(() => {})
        }
        break
      }

      // ── Pedido pronto → notifica entregador ───────────────────────────────
      case 'order_ready': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: {
            company: { select: { name: true, address: true } },
            delivery: { include: { driver: { include: { user: true } } } },
          },
        })
        if (!order?.delivery?.driver?.user?.pushToken) return

        await sendExpoPush(
          order.delivery.driver.user.pushToken,
          '✅ Pedido pronto para retirada!',
          `Pedido #${order.number} em ${order.company.name} está pronto. Vá buscar!`,
          { orderId: order.id, deliveryId: order.delivery.id, screen: 'entregas' },
        )
        break
      }

      // ── Entregador coletou → notifica cliente ─────────────────────────────
      case 'delivery_picked_up': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: { company: { select: { name: true } } },
        })
        if (!order) return

        await pushToUser(
          order.customerId,
          '🛵 Pedido a caminho!',
          `Seu pedido de ${order.company.name} saiu para entrega!`,
          { orderId: order.id, screen: 'pedidos' },
        )
        break
      }

      // ── Pagamento confirmado ───────────────────────────────────────────────
      case 'payment_confirmed': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: { company: { include: { owner: true } }, customer: true },
        })
        if (!order) return

        if (order.company.owner?.pushToken) {
          await sendExpoPush(
            order.company.owner.pushToken,
            '💰 Pagamento confirmado!',
            `Pedido #${order.number} pago. Pode iniciar o preparo!`,
            { orderId: order.id, screen: 'lojista-pedidos' },
          )
        }

        if (order.company.whatsapp && order.company.evolutionApiInstance) {
          await sendWhatsApp(
            order.company.evolutionApiInstance,
            order.company.evolutionApiKey ?? '',
            order.company.whatsapp,
            `✅ *Pagamento confirmado!*\nPedido #${order.number} — R$ ${Number(order.total).toFixed(2)}\nPode iniciar o preparo.`,
          ).catch(() => {})
        }
        break
      }

      // ── Status do pedido mudou → notifica cliente ─────────────────────────
      case 'order_status_changed': {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: { company: { select: { name: true } }, customer: true },
        })
        if (!order) return

        const label = ORDER_STATUS_LABEL[data.status as keyof typeof ORDER_STATUS_LABEL] ?? data.status

        await pushToUser(
          order.customerId,
          `Pedido #${order.number} atualizado`,
          `${order.company.name}: ${label}`,
          { orderId: order.id, screen: 'pedidos' },
        )
        break
      }

      // ── Entregador aprovado ───────────────────────────────────────────────
      case 'driver_approved': {
        const driver = await prisma.deliveryDriver.findUnique({
          where: { id: data.driverId },
          include: { user: true },
        })
        if (!driver) return

        if (driver.user.pushToken) {
          await sendExpoPush(
            driver.user.pushToken,
            '🎉 Cadastro aprovado!',
            'Você foi aprovado como entregador. Ative seu status e comece a receber pedidos!',
            { screen: 'perfil' },
          )
        }
        break
      }
    }
  },
  { connection: redis, concurrency: 5 },
)

worker.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} (${job.name}) concluído`)
})

worker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job?.id} (${job?.name}) falhou:`, err.message)
})

export default worker
