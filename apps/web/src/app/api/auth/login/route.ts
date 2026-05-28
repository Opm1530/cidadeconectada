import { NextRequest } from 'next/server'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/session'
import { ok, badRequest, unauthorized } from '@/lib/api-response'
import { cookies } from 'next/headers'
import type { AuthUser } from '@cc/shared'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.errors[0].message)
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) return unauthorized('Credenciais inválidas')

  const valid = await compare(password, user.password)
  if (!valid) return unauthorized('Credenciais inválidas')

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AuthUser['role'],
    cityId: user.cityId,
    avatarUrl: user.avatarUrl,
  }

  const accessToken = await signAccessToken(authUser)
  const refreshToken = await signRefreshToken(user.id)

  // Salva refresh token no banco
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } })

  const cookieStore = await cookies()
  setAuthCookies(cookieStore, accessToken, refreshToken)

  // Retorna tokens no body também para clientes mobile (que usam Bearer token)
  return ok({ user: authUser, accessToken, refreshToken })
}
