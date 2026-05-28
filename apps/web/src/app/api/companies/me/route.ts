import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma, prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, forbidden, notFound, unauthorized, badRequest } from '@/lib/api-response'

// GET /api/companies/me — dados da loja do lojista logado
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'COMPANY_OWNER') return forbidden()

  const company = await prisma.company.findUnique({
    where: { ownerId: session.id },
    select: {
      id: true, name: true, slug: true, description: true,
      logoUrl: true, coverUrl: true, phone: true, whatsapp: true,
      address: true, category: true, active: true,
      acceptsPix: true, acceptsCashOnDelivery: true, acceptsMercadoPago: true,
      pixKey: true,
      hasOwnDelivery: true, ownDeliveryFee: true, acceptsPlatformDrivers: true,
      isOpen: true, openingHours: true,
      _count: { select: { orders: true, products: true } },
    },
  })

  if (!company) return notFound('Loja não encontrada')
  return ok(company)
}

const dayHoursSchema = z.object({
  enabled: z.boolean(),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
})

const patchSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal('')).transform(v => v || null),
  coverUrl: z.string().url().nullable().optional().or(z.literal('')).transform(v => v || null),
  acceptsPix: z.boolean().optional(),
  pixKey: z.string().nullable().optional(),
  acceptsCashOnDelivery: z.boolean().optional(),
  acceptsMercadoPago: z.boolean().optional(),
  mercadoPagoToken: z.string().nullable().optional(),
  hasOwnDelivery: z.boolean().optional(),
  ownDeliveryFee: z.number().min(0).nullable().optional(),
  acceptsPlatformDrivers: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  openingHours: z.record(z.string(), dayHoursSchema).nullable().optional(),
})

// PATCH /api/companies/me — atualiza dados / abre ou fecha a loja
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'COMPANY_OWNER') return forbidden()

  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) return notFound('Loja não encontrada')

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { openingHours, ...rest } = parsed.data
  const updated = await prisma.company.update({
    where: { id: company.id },
    data: {
      ...rest,
      // openingHours é JSON nullable — Prisma exige Prisma.JsonNull em vez de null JS
      ...(openingHours !== undefined
        ? { openingHours: openingHours === null ? Prisma.JsonNull : openingHours }
        : {}),
    },
    select: {
      id: true, name: true, slug: true, active: true,
      description: true, category: true, phone: true, whatsapp: true,
      address: true, logoUrl: true, coverUrl: true,
      acceptsPix: true, pixKey: true, acceptsCashOnDelivery: true,
      acceptsMercadoPago: true, mercadoPagoToken: true,
      hasOwnDelivery: true, ownDeliveryFee: true, acceptsPlatformDrivers: true,
      isOpen: true, openingHours: true,
    },
  })

  return ok(updated)
}
