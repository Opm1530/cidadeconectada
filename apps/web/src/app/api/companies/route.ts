import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, forbidden, conflict, unauthorized } from '@/lib/api-response'
import { slugify } from '@cc/shared'

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  cityId: z.string(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = Number(searchParams.get('page') ?? 1)
  const perPage = Number(searchParams.get('perPage') ?? 20)

  const where: Record<string, unknown> = { active: true }
  if (cityId) where.cityId = cityId
  if (category) where.category = category
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const [data, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true, description: true,
        logoUrl: true, coverUrl: true, category: true, cityId: true,
        acceptsMercadoPago: true, acceptsPix: true, acceptsCashOnDelivery: true,
        hasOwnDelivery: true, ownDeliveryFee: true, acceptsPlatformDrivers: true,
      },
    }),
    prisma.company.count({ where }),
  ])

  return ok({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { name, cityId, ...rest } = parsed.data

  // Verifica se o usuário já tem uma empresa
  const existing = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (existing) return conflict('Você já possui uma empresa cadastrada')

  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city) return badRequest('Cidade não encontrada')

  // Gera slug único
  let slug = slugify(name)
  const slugExists = await prisma.company.findUnique({ where: { slug } })
  if (slugExists) slug = `${slug}-${Date.now()}`

  // Se a cidade não permite cadastro livre, a empresa inicia inativa
  const active = city.freeCompanyRegistration

  const [company] = await prisma.$transaction([
    prisma.company.create({
      data: { name, slug, cityId, ownerId: session.id, active, ...rest },
    }),
    // Promove o usuário para COMPANY_OWNER
    prisma.user.update({
      where: { id: session.id },
      data: { role: 'COMPANY_OWNER' },
    }),
    // Invalida tokens antigos para forçar novo login com role atualizado
    prisma.refreshToken.deleteMany({ where: { userId: session.id } }),
  ])

  return created(company)
}
