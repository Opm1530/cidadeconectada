import { cookies } from 'next/headers'
import { verifyAccessToken } from './jwt'
import type { AuthUser } from '@cc/shared'

/**
 * Lê sessão a partir de um Request — suporta Bearer token (mobile) e cookie (web).
 * Usar em rotas que precisam aceitar os dois modos de autenticação.
 */
export async function getSessionFromRequest(req: Request): Promise<AuthUser | null> {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return verifyAccessToken(auth.slice(7))
  }
  return getSession()
}

export const COOKIE_ACCESS = 'cc_access'
export const COOKIE_REFRESH = 'cc_refresh'

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_ACCESS)?.value
  if (!token) return null
  return verifyAccessToken(token)
}

export function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  accessToken: string,
  refreshToken: string,
) {
  const isProduction = process.env.NODE_ENV === 'production'

  cookieStore.set(COOKIE_ACCESS, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutos
    path: '/',
  })

  cookieStore.set(COOKIE_REFRESH, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_ACCESS)
  cookieStore.delete(COOKIE_REFRESH)
}
