import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { noContent, unauthorized, forbidden, notFound } from '@/lib/api-response'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ cityAdminId: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const { cityAdminId } = await params

  const cityAdmin = await prisma.cityAdmin.findUnique({ where: { id: cityAdminId } })
  if (!cityAdmin) return notFound()

  await prisma.cityAdmin.delete({ where: { id: cityAdminId } })

  // Verifica se ainda tem outros vínculos de cidade
  const remaining = await prisma.cityAdmin.findFirst({
    where: { userId: cityAdmin.userId },
    select: { cityId: true },
  })

  const user = await prisma.user.findUnique({ where: { id: cityAdmin.userId } })
  if (user && user.role === 'CITY_ADMIN') {
    if (remaining) {
      // Ainda admin de outra cidade — atualiza cityId para a primeira restante
      await prisma.user.update({
        where: { id: cityAdmin.userId },
        data: { cityId: remaining.cityId },
      })
    } else {
      // Sem mais vínculos — rebaixa para CUSTOMER e limpa cityId
      await prisma.user.update({
        where: { id: cityAdmin.userId },
        data: { role: 'CUSTOMER', cityId: null },
      })
    }
    // Nota: tokens NÃO são invalidados — o refresh endpoint lê o role atual
    // do banco, e o useSessionSync no mobile detecta a mudança automaticamente.
  }

  return noContent()
}
