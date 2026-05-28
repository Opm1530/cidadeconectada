import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/session'
import { ok, unauthorized } from '@/lib/api-response'
import { cookies } from 'next/headers'
import type { AuthUser } from '@cc/shared'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  // Aceita refresh token via cookie (web) ou via body/header (mobile)
  let refreshToken = cookieStore.get('cc_refresh')?.value
  if (!refreshToken) {
    // Tenta pegar do Authorization header (Bearer <refreshToken>)
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) refreshToken = authHeader.slice(7)
  }
  if (!refreshToken) {
    // Tenta pegar do body JSON
    try {
      const body = await req.json()
      refreshToken = body?.refreshToken
    } catch {}
  }

  if (!refreshToken) return unauthorized('Refresh token ausente')

  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return unauthorized('Refresh token inválido')

  // Verifica se o token existe e está válido no banco
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date()) {
    return unauthorized('Refresh token expirado')
  }

  const { user } = stored

  // Rotaciona o refresh token (invalida o antigo, cria um novo)
  await prisma.refreshToken.delete({ where: { id: stored.id } })

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AuthUser['role'],
    cityId: user.cityId,
    avatarUrl: user.avatarUrl,
  }

  const newAccessToken = await signAccessToken(authUser)
  const newRefreshToken = await signRefreshToken(user.id)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id, expiresAt } })

  setAuthCookies(cookieStore, newAccessToken, newRefreshToken)

  return ok({ user: authUser, accessToken: newAccessToken, refreshToken: newRefreshToken })
}
