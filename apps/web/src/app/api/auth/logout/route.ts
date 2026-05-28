import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { ok } from '@/lib/api-response'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('cc_refresh')?.value

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {})
  }

  cookieStore.delete('cc_access')
  cookieStore.delete('cc_refresh')

  return ok({ message: 'Logout realizado' })
}
