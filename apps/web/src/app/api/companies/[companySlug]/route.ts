import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound, unauthorized } from '@/lib/api-response'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  active: z.boolean().optional(),
  // Pagamento
  acceptsMercadoPago: z.boolean().optional(),
  mercadoPagoToken: z.string().optional(),
  acceptsPix: z.boolean().optional(),
  pixKey: z.string().optional(),
  acceptsCashOnDelivery: z.boolean().optional(),
  // Entrega
  hasOwnDelivery: z.boolean().optional(),
  ownDeliveryFee: z.number().min(0).optional(),
  acceptsPlatformDrivers: z.boolean().optional(),
  // WhatsApp
  evolutionApiInstance: z.string().optional(),
  evolutionApiKey: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params

  // Aceita slug ou CUID (id)
  const company = await prisma.company.findFirst({
    where: { OR: [{ slug: companySlug }, { id: companySlug }] },
    include: {
      products: {
        where: { active: true },
        orderBy: { order: 'asc' },
        include: {
          optionGroups: {
            orderBy: { order: 'asc' },
            include: { options: { where: { active: true }, orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })

  if (!company || !company.active) return notFound('Empresa não encontrada')

  // Remove dados sensíveis do retorno público
  const { mercadoPagoToken, evolutionApiKey, ...safeCompany } = company
  return ok(safeCompany)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params
  const session = await getSession()
  if (!session) return unauthorized()

  const company = await prisma.company.findFirst({ where: { OR: [{ slug: companySlug }, { id: companySlug }] } })
  if (!company) return notFound('Empresa não encontrada')

  // Apenas o dono ou admin pode editar
  const isOwner = company.ownerId === session.id
  const isAdmin = session.role === 'CITY_ADMIN' || session.role === 'SUPER_ADMIN'
  if (!isOwner && !isAdmin) return forbidden()

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const updated = await prisma.company.update({ where: { id: company.id }, data: parsed.data })
  const { mercadoPagoToken, evolutionApiKey, ...safeUpdated } = updated
  return ok(safeUpdated)
}
