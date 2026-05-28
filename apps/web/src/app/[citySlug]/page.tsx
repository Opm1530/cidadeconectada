import { Suspense } from 'react'
import { prisma } from '@cc/database'
import { notFound } from 'next/navigation'
import { CompanyCard } from '@/components/catalog/company-card'
import { ProductCard } from '@/components/catalog/product-card'
import { CatalogSearch } from './catalog-search'
import { BannerCarousel } from './banner-carousel'
import { HomeGridBanners } from './home-grid-banners'
import {
  Store, ChevronRight, Newspaper, BarChart3,
  Syringe, Shield, Calendar, Landmark, Globe, Leaf, GraduationCap,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

interface Props {
  params: Promise<{ citySlug: string }>
  searchParams: Promise<{ q?: string; categoria?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { citySlug } = await params
  const city = await prisma.city.findUnique({ where: { slug: citySlug }, select: { name: true, state: true } })
  return { title: city ? `${city.name} — ${city.state}` : 'Cidade' }
}

export default async function CityPage({ params, searchParams }: Props) {
  const { citySlug } = await params
  const { q, categoria } = await searchParams

  const now = new Date()
  const activeBannerWhere = {
    active: true as const,
    OR: [{ startsAt: null as null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ endsAt: null as null }, { endsAt: { gte: now } }] }],
  }

  const city = await prisma.city.findUnique({
    where: { slug: citySlug, active: true },
    include: {
      banners: {
        where: { ...activeBannerWhere, type: 'CITY_HERO' },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!city) notFound()

  // Banners em grid (HOME_GRID) — máx 3
  const gridBanners = await prisma.banner.findMany({
    where: { cityId: city.id, type: 'HOME_GRID', ...activeBannerWhere },
    orderBy: { order: 'asc' },
    take: 3,
    select: { id: true, imageUrl: true, title: true, subtitle: true, link: true },
  })

  const isFiltering = !!(q || categoria)

  // All companies (filtered or not)
  const companies = await prisma.company.findMany({
    where: {
      cityId: city.id,
      active: true,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(categoria ? { category: categoria } : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, slug: true, description: true, logoUrl: true, coverUrl: true,
      category: true, cityId: true, acceptsMercadoPago: true, acceptsPix: true,
      acceptsCashOnDelivery: true, hasOwnDelivery: true, ownDeliveryFee: true,
      acceptsPlatformDrivers: true, createdAt: true,
    },
  })

  const categoryRows = await prisma.company.findMany({
    where: { cityId: city.id, active: true, category: { not: null } },
    distinct: ['category'],
    select: { category: true },
  })
  const categories = categoryRows.map((c) => c.category!)

  // Featured products (only on home, not when filtering)
  const featuredProducts = isFiltering ? [] : await prisma.product.findMany({
    where: {
      active: true,
      company: { cityId: city.id, active: true },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true, name: true, description: true, price: true, imageUrl: true,
      company: { select: { name: true, slug: true } },
    },
  })

  // New companies (only on home)
  const newCompanies = isFiltering ? [] : companies.slice(0, 6)

  // News + Polls (only on home)
  const [latestNews, activePolls] = isFiltering ? [[], []] : await Promise.all([
    prisma.news.findMany({
      where: { cityId: city.id, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, summary: true, category: true, publishedAt: true },
    }),
    prisma.poll.findMany({
      where: { cityId: city.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { id: true, title: true, description: true, endsAt: true },
    }),
  ])

  return (
    <main className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-8 pb-16">

      {/* ── HERO BANNER ── */}
      <BannerCarousel banners={city.banners} citySlug={citySlug} />

      {/* ── SEARCH + CATEGORIES ── */}
      <section className="flex flex-col gap-5">
        <Suspense fallback={null}>
          <CatalogSearch
            citySlug={citySlug}
            categories={categories}
            currentCategory={categoria}
            currentQ={q}
          />
        </Suspense>
      </section>

      {/* ── FILTERING RESULTS ── */}
      {isFiltering && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {categoria ?? `Resultados para "${q}"`}
            </h2>
            <span className="text-sm text-gray-400">{companies.length} {companies.length === 1 ? 'loja' : 'lojas'}</span>
          </div>

          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Store size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm text-center">Nenhuma loja encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company as any} citySlug={citySlug} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── HOME SECTIONS (no filter) ── */}
      {!isFiltering && (
        <>
          {/* ── FEATURED PRODUCTS ── */}
          {featuredProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Em destaque</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Produtos mais recentes da cidade</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product as any}
                    company={product.company}
                    citySlug={citySlug}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── HOME GRID BANNERS ── */}
          {gridBanners.length > 0 && (
            <HomeGridBanners banners={gridBanners} />
          )}

          {/* ── CITY COMMUNICATION: NEWS + POLLS ── */}
          {(latestNews.length > 0 || activePolls.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Da Prefeitura</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Notícias e enquetes para você</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestNews.map((item) => {
                  const CATEGORY_CONFIG = {
                    GENERAL:        { label: 'Geral',          icon: Newspaper,     color: 'bg-gray-100 text-gray-600' },
                    HEALTH:         { label: 'Saúde',          icon: Syringe,       color: 'bg-green-100 text-green-700' },
                    SECURITY:       { label: 'Segurança',      icon: Shield,        color: 'bg-blue-100 text-blue-700' },
                    EVENTS:         { label: 'Eventos',        icon: Calendar,      color: 'bg-purple-100 text-purple-700' },
                    INFRASTRUCTURE: { label: 'Infraestrutura', icon: Landmark,      color: 'bg-orange-100 text-orange-700' },
                    ECONOMY:        { label: 'Economia',       icon: Globe,         color: 'bg-yellow-100 text-yellow-700' },
                    ENVIRONMENT:    { label: 'Meio Ambiente',  icon: Leaf,          color: 'bg-emerald-100 text-emerald-700' },
                    EDUCATION:      { label: 'Educação',       icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700' },
                  } as const
                  const cat = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.GENERAL
                  const CatIcon = cat.icon
                  return (
                    <Link
                      key={item.id}
                      href={`/${citySlug}/noticias/${item.id}`}
                      className="group bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 hover:shadow-sm hover:border-gray-200 transition-all"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cat.color)}>
                        <CatIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-400 mb-0.5">{cat.label}</p>
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.summary}</p>
                        )}
                        {item.publishedAt && (
                          <p className="text-xs text-gray-300 mt-1.5">
                            {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
                {activePolls.map((poll) => (
                  <Link
                    key={poll.id}
                    href={`/${citySlug}/enquetes/${poll.id}`}
                    className="group bg-primary-50 rounded-2xl border border-primary-100 p-4 flex gap-3 hover:shadow-sm hover:border-primary-200 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 size={18} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary-400 mb-0.5">Enquete ativa</p>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug">
                        {poll.title}
                      </h3>
                      {poll.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{poll.description}</p>
                      )}
                      <span className="inline-block mt-2 text-xs bg-primary-600 text-white px-2.5 py-0.5 rounded-full font-medium">
                        Participar
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="flex gap-4 mt-3">
                <Link
                  href={`/${citySlug}/noticias`}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
                >
                  <Newspaper size={12} />
                  Ver todas as notícias <ChevronRight size={12} />
                </Link>
                <Link
                  href={`/${citySlug}/enquetes`}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
                >
                  <BarChart3 size={12} />
                  Ver enquetes <ChevronRight size={12} />
                </Link>
              </div>
            </section>
          )}

          {/* ── NEW STORES ── */}
          {newCompanies.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Lojas e Serviços</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Tudo disponível em {city.name}</p>
                </div>
                {companies.length > 6 && (
                  <Link
                    href={`/${citySlug}?all=1`}
                    className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:underline"
                  >
                    Ver todas <ChevronRight size={14} />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {newCompanies.map((company) => (
                  <CompanyCard key={company.id} company={company as any} citySlug={citySlug} />
                ))}
              </div>
            </section>
          )}

          {/* ── ALL STORES (when 'all' param) ── */}
          {companies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Store size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm text-center">
                Nenhuma loja disponível ainda.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  )
}
