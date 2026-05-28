import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, badRequest, forbidden, notFound } from '@/lib/api-response'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  state: z.string().length(2).optional(),
  active: z.boolean().optional(),
  freeCompanyRegistration: z.boolean().optional(),
  maxDrivers: z.number().int().positive().nullable().optional(),
  // Rodapé
  footerAbout: z.string().max(500).nullable().optional(),
  footerPhone: z.string().max(20).nullable().optional(),
  footerEmail: z.string().email().nullable().optional(),
  footerAddress: z.string().max(200).nullable().optional(),
  footerInstagram: z.string().url().nullable().optional(),
  footerFacebook: z.string().url().nullable().optional(),
  footerWhatsapp: z.string().max(20).nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    include: { neighborhoods: { orderBy: { name: 'asc' } } },
  })
  if (!city) return notFound('Cidade não encontrada')
  return ok(city)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params
  const session = await getSession()
  if (!session) return forbidden()

  const city = await prisma.city.findUnique({ where: { slug: citySlug } })
  if (!city) return notFound('Cidade não encontrada')

  // Apenas Super Admin ou admin da cidade pode editar
  if (session.role !== 'SUPER_ADMIN') {
    const isAdmin = await prisma.cityAdmin.findFirst({
      where: { cityId: city.id, userId: session.id },
    })
    if (!isAdmin) return forbidden()
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const updated = await prisma.city.update({ where: { id: city.id }, data: parsed.data })
  return ok(updated)
}
