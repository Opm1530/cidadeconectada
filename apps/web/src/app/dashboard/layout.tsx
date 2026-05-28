export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_OWNER') redirect('/login?redirect=/dashboard')

  const company = await prisma.company.findUnique({
    where: { ownerId: session.id },
    select: { id: true, name: true, slug: true, active: true, cityId: true, city: { select: { slug: true } } },
  })

  // Se não tem empresa, redireciona para o cadastro
  if (!company) redirect('/dashboard/cadastro')

  return (
    <DashboardShell
      company={{ id: company.id, name: company.name, slug: company.slug, active: company.active, citySlug: company.city.slug }}
      user={{ name: session.name, email: session.email }}
    >
      {children}
    </DashboardShell>
  )
}
