import { prisma } from '@cc/database'
import { CompanyManagerSuperadmin } from './company-manager'

export default async function SuperAdminLojasPage() {
  const [companies, cities] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true, category: true, active: true, createdAt: true,
        city: { select: { id: true, name: true, state: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { orders: true, products: true } },
      },
    }),
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, state: true },
    }),
  ])

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Lojas</h1>
        <p className="text-sm text-gray-400 mt-0.5">{companies.length} lojas cadastradas na plataforma</p>
      </div>
      <CompanyManagerSuperadmin
        companies={companies.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
        cities={cities}
      />
    </div>
  )
}
