import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, noContent, badRequest, forbidden, unauthorized, notFound } from '@/lib/api-response'

async function getAdminBanner(session: Awaited<ReturnType<typeof getSession>>, bannerId: string) {
  if (!session) return null
  const banner = await prisma.banner.findUnique({ where: { id: bannerId } })
  if (!banner) return null

  const isAdmin =
    session.role === 'SUPER_ADMIN' ||
    !!(await prisma.cityAdmin.findFirst({ where: { userId: session.id, cityId: banner.cityId } }))

  return isAdmin ? banner : null
}

const patchSchema = z.object({
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  title: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bannerId: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { bannerId } = await params
  const banner = await getAdminBanner(session, bannerId)
  if (!banner) return notFound()

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { link, ...rest } = parsed.data
  const updated = await prisma.banner.update({
    where: { id: bannerId },
    data: { ...rest, ...(link !== undefined ? { link: link || null } : {}) },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ bannerId: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { bannerId } = await params
  const banner = await getAdminBanner(session, bannerId)
  if (!banner) return notFound()

  await prisma.banner.delete({ where: { id: bannerId } })
  return noContent()
}
