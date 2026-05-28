import { notFound } from 'next/navigation'
import { prisma } from '@cc/database'
import { CompanyMenu } from './company-menu'
import Image from 'next/image'
import { Store, Phone, MapPin, Clock } from 'lucide-react'
import { formatPhone } from '@cc/shared'
import { isOpenNow, todaySchedule, type OpeningHours } from '@/lib/opening-hours'

interface Props {
  params: Promise<{ citySlug: string; companySlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { companySlug } = await params
  const company = await prisma.company.findUnique({ where: { slug: companySlug }, select: { name: true } })
  return { title: company?.name ?? 'Empresa' }
}

export default async function CompanyPage({ params }: Props) {
  const { citySlug, companySlug } = await params

  const company = await prisma.company.findUnique({
    where: { slug: companySlug, active: true },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      products: {
        where: { active: true },
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
        include: {
          optionGroups: {
            orderBy: { order: 'asc' },
            include: { options: { where: { active: true }, orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })

  if (!company || company.city.slug !== citySlug) notFound()

  const hours = company.openingHours as OpeningHours | null
  const open = isOpenNow(hours)
  const schedule = todaySchedule(hours)

  return (
    <main className="max-w-3xl mx-auto">
      {/* Capa */}
      <div className="relative h-44 bg-gradient-to-br from-primary-200 to-primary-50">
        {company.coverUrl && (
          <Image src={company.coverUrl} alt={company.name} fill sizes="100vw" unoptimized className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Info da empresa */}
      <div className="bg-white px-4 pt-3 pb-4 border-b border-gray-100">
        <div className="flex items-end gap-4 -mt-8 mb-3">
          <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden shrink-0">
            {company.logoUrl ? (
              <Image src={company.logoUrl} alt={company.name} fill sizes="100vw" unoptimized className="object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-50 flex items-center justify-center">
                <Store size={24} className="text-primary-400" />
              </div>
            )}
          </div>
          <div className="pb-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
              {hours && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {open ? 'Aberto' : 'Fechado'}
                </span>
              )}
            </div>
            {company.category && <p className="text-sm text-gray-400">{company.category}</p>}
          </div>
        </div>

        {company.description && (
          <p className="text-sm text-gray-600 mb-3">{company.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {company.address && (
            <span className="flex items-center gap-1"><MapPin size={12} />{company.address}</span>
          )}
          {company.phone && (
            <span className="flex items-center gap-1"><Phone size={12} />{formatPhone(company.phone)}</span>
          )}
          {schedule && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {schedule}
            </span>
          )}
        </div>
      </div>

      {/* Produtos — client component para interatividade */}
      <CompanyMenu
        company={{
          id: company.id,
          name: company.name,
          cityId: company.cityId,
          citySlug,
          acceptsMercadoPago: company.acceptsMercadoPago,
          acceptsPix: company.acceptsPix,
          acceptsCashOnDelivery: company.acceptsCashOnDelivery,
          hasOwnDelivery: company.hasOwnDelivery,
          acceptsPlatformDrivers: company.acceptsPlatformDrivers,
          ownDeliveryFee: company.ownDeliveryFee ? Number(company.ownDeliveryFee) : null,
        }}
        products={company.products.map((p) => ({
          ...p,
          price: Number(p.price),
          category: p.category ?? null,
          optionGroups: p.optionGroups.map((g) => ({
            ...g,
            options: g.options.map((o) => ({ ...o, priceAdd: Number(o.priceAdd) })),
          })),
        }))}
      />
    </main>
  )
}
