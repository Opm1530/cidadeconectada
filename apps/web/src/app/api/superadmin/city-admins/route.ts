import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, unauthorized, forbidden, notFound, conflict } from '@/lib/api-response'

const schema = z.object({
  email: z.string().email(),
  cityId: z.string(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const cityAdmins = await prisma.cityAdmin.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      city: { select: { id: true, name: true, state: true } },
    },
    orderBy: { city: { name: 'asc' } },
  })
  return ok(cityAdmins)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { email, cityId } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return notFound('Usuário não encontrado')
  if (user.role === 'SUPER_ADMIN') return badRequest('Super admins não precisam ser vinculados a cidades.')

  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city) return notFound('Cidade não encontrada')

  const existing = await prisma.cityAdmin.findFirst({ where: { userId: user.id, cityId } })
  if (existing) return conflict('Usuário já é administrador desta cidade')

  const [cityAdmin] = await prisma.$transaction([
    prisma.cityAdmin.create({
      data: { userId: user.id, cityId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        city: { select: { id: true, name: true, state: true } },
      },
    }),
    // Promove role e define a cidade do usuário
    prisma.user.update({
      where: { id: user.id },
      data: { role: 'CITY_ADMIN', cityId },
    }),
    // Nota: tokens NÃO são invalidados — o refresh endpoint lê o role atual
    // do banco, e o useSessionSync no mobile detecta a mudança automaticamente.
  ])

  return created(cityAdmin)
}
