import { getSession } from '@/lib/auth/session'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET() {
  const user = await getSession()
  if (!user) return unauthorized()
  return ok({ user })
}
