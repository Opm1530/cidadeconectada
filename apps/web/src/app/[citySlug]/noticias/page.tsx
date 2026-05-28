import { prisma } from '@cc/database'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Newspaper, Syringe, Shield, Calendar, Landmark,
  Globe, Leaf, GraduationCap, ChevronRight, Users, ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  params: Promise<{ citySlug: string }>
}

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

export default async function NoticiasPage({ params }: Props) {
  const { citySlug } = await params

  const city = await prisma.city.findUnique({
    where: { slug: citySlug, active: true },
    select: { id: true, name: true, slug: true },
  })
  if (!city) notFound()

  const news = await prisma.news.findMany({
    where: { cityId: city.id, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
  })

  const featured = news[0]
  const rest = news.slice(1)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Newspaper size={20} className="text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notícias e Comunicados</h1>
          <p className="text-sm text-gray-400">{city.name} informa</p>
        </div>
      </div>

      {news.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Newspaper size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma notícia publicada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Destaque */}
          {featured && <FeaturedCard item={featured} citySlug={citySlug} />}

          {/* Restante */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rest.map((item) => <NewsCard key={item.id} item={item} citySlug={citySlug} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type NewsItem = Awaited<ReturnType<typeof prisma.news.findMany>>[0]

function FeaturedCard({ item, citySlug }: { item: NewsItem; citySlug: string }) {
  const cat = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]
  const CatIcon = cat.icon

  return (
    <Link href={`/${citySlug}/noticias/${item.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {item.imageUrl ? (
          <div className="relative h-52 w-full">
            <Image src={item.imageUrl} alt={item.title} fill sizes="100vw" unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className={cn('absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/30')}>
              <CatIcon size={12} />
              {cat.label}
            </span>
          </div>
        ) : (
          <div className={cn('h-16 w-full flex items-center px-6 gap-3', cat.color.replace('text-', 'bg-').split(' ')[0], 'bg-opacity-30')}>
            <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', cat.color)}>
              <CatIcon size={12} />
              {cat.label}
            </span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Destaque</span>
          </div>
        )}
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors leading-snug mb-2">
            {item.title}
          </h2>
          {item.summary && <p className="text-sm text-gray-500 line-clamp-2">{item.summary}</p>}
          <div className="flex items-center justify-between mt-4">
            <AudienceBadge audience={item.audience as 'ALL' | 'MERCHANTS' | 'CUSTOMERS'} />
            <span className="text-xs text-gray-400 flex items-center gap-1">
              {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ''}
              <ChevronRight size={13} className="text-primary-400" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function NewsCard({ item, citySlug }: { item: NewsItem; citySlug: string }) {
  const cat = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]
  const CatIcon = cat.icon

  return (
    <Link href={`/${citySlug}/noticias/${item.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-sm hover:border-gray-200 transition-all h-full">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cat.color)}>
          <CatIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-primary-600 transition-colors line-clamp-2 mb-1">
            {item.title}
          </h3>
          {item.summary && <p className="text-xs text-gray-400 line-clamp-2">{item.summary}</p>}
          <div className="flex items-center justify-between mt-3">
            <AudienceBadge audience={item.audience as 'ALL' | 'MERCHANTS' | 'CUSTOMERS'} />
            <span className="text-xs text-gray-400">
              {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : ''}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function AudienceBadge({ audience }: { audience: 'ALL' | 'MERCHANTS' | 'CUSTOMERS' }) {
  const config = {
    ALL:       { label: 'Todos',    icon: Globe,      color: 'text-gray-500 bg-gray-100' },
    MERCHANTS: { label: 'Lojistas', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
    CUSTOMERS: { label: 'Clientes', icon: Users,      color: 'text-blue-600 bg-blue-50' },
  }
  const { label, icon: Icon, color } = config[audience]
  return (
    <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', color)}>
      <Icon size={11} /> {label}
    </span>
  )
}
