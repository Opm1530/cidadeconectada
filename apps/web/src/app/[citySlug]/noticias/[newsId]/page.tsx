import { prisma } from '@cc/database'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Syringe, Shield, Calendar, Landmark,
  Globe, Leaf, GraduationCap, Newspaper, Clock,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  params: Promise<{ citySlug: string; newsId: string }>
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

export default async function NewsDetailPage({ params }: Props) {
  const { citySlug, newsId } = await params

  const news = await prisma.news.findUnique({
    where: { id: newsId },
    include: { city: { select: { name: true, slug: true } } },
  })

  if (!news || news.city.slug !== citySlug || news.status !== 'PUBLISHED') notFound()

  const cat = CATEGORY_CONFIG[news.category as keyof typeof CATEGORY_CONFIG]
  const CatIcon = cat.icon

  // Busca mais notícias relacionadas
  const related = await prisma.news.findMany({
    where: {
      cityId: news.cityId,
      status: 'PUBLISHED',
      id: { not: news.id },
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { id: true, title: true, category: true, publishedAt: true },
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Voltar */}
      <Link
        href={`/${citySlug}/noticias`}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Voltar às notícias
      </Link>

      <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Imagem de capa */}
        {news.imageUrl && (
          <div className="relative h-56 w-full">
            <Image src={news.imageUrl} alt={news.title} fill sizes="100vw" unoptimized className="object-cover" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          {/* Categoria + data */}
          <div className="flex items-center gap-3">
            <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', cat.color)}>
              <CatIcon size={12} />
              {cat.label}
            </span>
            {news.publishedAt && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} />
                {new Date(news.publishedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{news.title}</h1>

          {/* Resumo */}
          {news.summary && (
            <p className="text-base text-gray-600 leading-relaxed border-l-4 border-primary-200 pl-4">
              {news.summary}
            </p>
          )}

          {/* Conteúdo */}
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line border-t border-gray-50 pt-4">
            {news.content}
          </div>

          {/* Rodapé */}
          <div className="pt-4 border-t border-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>Publicado por {news.city.name}</span>
            {news.publishedAt && (
              <span>{new Date(news.publishedAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
      </article>

      {/* Mais notícias */}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mais notícias</h2>
          <div className="flex flex-col gap-2">
            {related.map((item) => {
              const relCat = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]
              const RelIcon = relCat.icon
              return (
                <Link
                  key={item.id}
                  href={`/${citySlug}/noticias/${item.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', relCat.color)}>
                    <RelIcon size={15} />
                  </span>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-1 flex-1">
                    {item.title}
                  </span>
                  {item.publishedAt && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
