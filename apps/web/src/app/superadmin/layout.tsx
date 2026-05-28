export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SuperAdminShell } from './superadmin-shell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/superadmin')
  if (session.role !== 'SUPER_ADMIN') redirect('/')

  return (
    <SuperAdminShell user={{ name: session.name, email: session.email }}>
      {children}
    </SuperAdminShell>
  )
}
