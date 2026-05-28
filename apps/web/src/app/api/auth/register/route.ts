import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/session'
import { created, badRequest, conflict } from '@/lib/api-response'
import { cookies } from 'next/headers'
import type { AuthUser } from '@cc/shared'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  cityId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.errors[0].message)
  }

  const { name, email, phone, password, cityId } = parsed.data

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return conflict('Email já cadastrado')

  if (cityId) {
    const city = await prisma.city.findUnique({ where: { id: cityId } })
    if (!city) return badRequest('Cidade não encontrada')
  }

  const hashedPassword = await hash(password, 10)

  const user = await prisma.user.create({
    data: { name, email, phone, password: hashedPassword, cityId, role: 'CUSTOMER' },
  })

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'CUSTOMER',
    cityId: user.cityId,
    avatarUrl: null,
  }

  const accessToken = await signAccessToken(authUser)
  const refreshToken = await signRefreshToken(user.id)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } })

  const cookieStore = await cookies()
  setAuthCookies(cookieStore, accessToken, refreshToken)

  // Retorna tokens no body também para clientes mobile (que usam Bearer token)
  return created({ user: authUser, accessToken, refreshToken })
}
