import { Redis } from 'ioredis'
import { prisma } from '@cc/database'
import { getSessionFromRequest } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/realtime
 *
 * Endpoint SSE (Server-Sent Events). O cliente conecta e mantém a conexão
 * aberta — o servidor empurra eventos em tempo real via Redis Pub/Sub.
 *
 * Canais por role:
 *   COMPANY_OWNER    → company:{companyId}
 *   DELIVERY_DRIVER  → driver:{driverId} + city:{cityId}
 *   CUSTOMER / admin → order:{orderId}  (requer ?orderId=xxx)
 */
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const channels: string[] = []

  if (session.role === 'COMPANY_OWNER') {
    const company = await prisma.company.findUnique({
      where: { ownerId: session.id },
      select: { id: true },
    })
    if (company) channels.push(`company:${company.id}`)

  } else if (session.role === 'DELIVERY_DRIVER') {
    const driver = await prisma.deliveryDriver.findFirst({
      where: { userId: session.id },
      select: { id: true, cityId: true },
    })
    if (driver) {
      channels.push(`driver:${driver.id}`)
      channels.push(`city:${driver.cityId}`)
    }

  } else {
    // CUSTOMER, CITY_ADMIN, SUPER_ADMIN — rastreia um pedido específico
    const orderId = url.searchParams.get('orderId')
    if (orderId) channels.push(`order:${orderId}`)
  }

  if (channels.length === 0) {
    return new Response('No channels available', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Conexão dedicada de subscriber por request
      const sub = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null,
      })

      function enqueue(text: string) {
        try { controller.enqueue(encoder.encode(text)) } catch { /* stream fechada */ }
      }

      await sub.subscribe(...channels)

      sub.on('message', (_channel: string, message: string) => {
        enqueue(`data: ${message}\n\n`)
      })

      // Heartbeat a cada 25s para manter a conexão viva através de proxies
      const heartbeat = setInterval(() => {
        enqueue(': ping\n\n')
      }, 25_000)

      // Envia confirmação inicial de conexão
      enqueue(`data: ${JSON.stringify({ type: 'CONNECTED', channels })}\n\n`)

      req.signal.addEventListener('abort', async () => {
        clearInterval(heartbeat)
        try {
          await sub.unsubscribe(...channels)
          sub.disconnect()
        } catch { /* ignorar erros de desconexão */ }
        try { controller.close() } catch { /* ignorar */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // desativa buffer do nginx
    },
  })
}
