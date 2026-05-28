import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { noContent, forbidden, notFound, unauthorized } from '@/lib/api-response'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ neighborhoodId: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { neighborhoodId } = await params

  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } })
  if (!neighborhood) return notFound('Bairro não encontrado')

  const isAdmin =
    session.role === 'SUPER_ADMIN' ||
    !!(await prisma.cityAdmin.findFirst({ where: { userId: session.id, cityId: neighborhood.cityId } }))

  if (!isAdmin) return forbidden()

  await prisma.neighborhood.delete({ where: { id: neighborhoodId } })
  return noContent()
}
