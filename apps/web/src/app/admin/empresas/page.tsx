import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { formatDate } from '@cc/shared'
import { Search } from 'lucide-react'
import { CompanyActions } from './company-actions'

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function AdminCompaniesPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { status, q } = await searchParams

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: true },
  })
  if (!cityAdmin) redirect('/')

  const city = cityAdmin.city

  const where: Record<string, unknown> = { cityId: city.id }
  if (status === 'inactive') where.active = false
  else if (status === 'active') where.active = true
  if (q) where.name = { contains: q, mode: 'insensitive' }

  const companies = await prisma.company.findMany({
    where,
    orderBy: [{ active: 'asc' }, { createdAt: 'desc' }],
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      _count: { select: { products: true, orders: true } },
    },
  })

  const totalActive = await prisma.company.count({ where: { cityId: city.id, active: true } })
  const totalInactive = await prisma.company.count({ where: { cityId: city.id, active: false } })

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalActive} ativa{totalActive !== 1 ? 's' : ''} · {totalInactive} inativa{totalInactive !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Config de cadastro livre */}
        <CompanyRegistrationToggle citySlug={city.slug} freeRegistration={city.freeCompanyRegistration} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar empresa..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        <div className="flex gap-2">
          {[
            { value: '', label: 'Todas' },
            { value: 'active', label: 'Ativas' },
            { value: 'inactive', label: 'Inativas' },
          ].map((opt) => (
            <a
              key={opt.value}
              href={`/admin/empresas${opt.value ? `?status=${opt.value}` : ''}`}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                (status ?? '') === opt.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>

      {/* Lista */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400 text-sm">
          Nenhuma empresa encontrada.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className={`bg-white border rounded-xl p-4 ${company.active ? 'border-gray-100' : 'border-yellow-200 bg-yellow-50/30'}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    {company.category && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{company.category}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {company.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Dono: {company.owner.name}</span>
                    {company.owner.email && <span>{company.owner.email}</span>}
                    {company.owner.phone && <span>{company.owner.phone}</span>}
                  </div>
                  <div className="mt-1.5 text-xs text-gray-400 flex gap-3">
                    <span>{company._count.products} produto{company._count.products !== 1 ? 's' : ''}</span>
                    <span>{company._count.orders} pedido{company._count.orders !== 1 ? 's' : ''}</span>
                    <span>Desde {formatDate(company.createdAt)}</span>
                  </div>
                </div>

                <CompanyActions companySlug={company.slug} active={company.active} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyRegistrationToggle({ citySlug, freeRegistration }: { citySlug: string; freeRegistration: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2">
      <span>Cadastro livre:</span>
      <ToggleRegistration citySlug={citySlug} freeRegistration={freeRegistration} />
    </div>
  )
}

// Importado abaixo como client component
import { ToggleRegistration } from './toggle-registration'
