'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Banner {
  id: string
  imageUrl: string
  title: string | null
  link: string | null
}

interface BannerCarouselProps {
  banners: Banner[]
  citySlug: string
}

export function BannerCarousel({ banners, citySlug }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 4000)
    return () => clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) {
    return (
      <div className="relative w-full h-52 sm:h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-purple-700 flex items-center px-6 sm:px-10">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/10 rounded-full" />
        <div className="absolute -bottom-16 -right-4 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute top-4 right-32 w-20 h-20 bg-white/10 rounded-full" />
        <div className="relative max-w-sm z-10">
          <span className="inline-block text-xs text-primary-200 font-bold uppercase tracking-widest mb-3 bg-white/10 px-3 py-1 rounded-full">
            Seu marketplace local
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
            Peça agora,<br/>receba em casa
          </h2>
          <p className="text-primary-100 text-sm leading-relaxed">
            Lojas, restaurantes e serviços da sua cidade em um só lugar.
          </p>
        </div>
      </div>
    )
  }

  const banner = banners[current]

  return (
    <div className="relative w-full h-52 sm:h-72 rounded-2xl overflow-hidden group">
      {/* Image or gradient */}
      <a href={banner.link ?? '#'} className="block w-full h-full">
        <Image
          src={banner.imageUrl}
          alt={banner.title ?? 'Banner'}
          fill sizes="100vw" unoptimized
          className="object-cover transition-transform duration-500"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {banner.title && (
          <div className="absolute bottom-0 left-0 p-5">
            <p className="text-white font-bold text-xl drop-shadow-lg">{banner.title}</p>
          </div>
        )}
      </a>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <ChevronRight size={16} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
