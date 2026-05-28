export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { AdminShell } from './admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/admin')
  if (session.role !== 'CITY_ADMIN' && session.role !== 'SUPER_ADMIN') redirect('/')

  // Busca a cidade que este admin gerencia
  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: { select: { id: true, name: true, slug: true, active: true } } },
  })

  // Super admin sem vínculo → vai pro superadmin
  if (!cityAdmin && session.role === 'SUPER_ADMIN') redirect('/superadmin')
  if (!cityAdmin) redirect('/')

  return (
    <AdminShell
      city={cityAdmin.city}
      user={{ name: session.name, email: session.email, role: session.role }}
    >
      {children}
    </AdminShell>
  )
}
