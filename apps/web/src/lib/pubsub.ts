import { Redis } from 'ioredis'

// Conexão dedicada para publish (separada da fila BullMQ)
// Uma conexão em modo subscriber não pode publicar — por isso é separada.
const pub = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
})

pub.on('error', () => { /* silencia erros de conexão — realtime é best-effort */ })

export type RealtimeEvent = { type: string; [key: string]: unknown }

/**
 * Publica um evento em um canal Redis (fire-and-forget).
 * Canais usados:
 *   order:{orderId}      → cliente acompanhando o pedido
 *   company:{companyId}  → dashboard do lojista
 *   driver:{driverId}    → entregas do entregador
 *   city:{cityId}        → entregas não atribuídas na cidade (todos os entregadores)
 */
export function publishEvent(channel: string, event: RealtimeEvent): void {
  pub.publish(channel, JSON.stringify(event)).catch(() => {})
}
