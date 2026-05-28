'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BannerData {
  id: string
  imageUrl: string
  title: string | null
  subtitle: string | null
  link: string | null
}

export function CartBanner({ citySlug }: { citySlug: string }) {
  const [banner, setBanner] = useState<BannerData | null>(null)

  useEffect(() => {
    fetch(`/api/cities/${citySlug}/cart-banner`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBanner(data))
      .catch(() => {})
  }, [citySlug])

  if (!banner) return null

  const inner = (
    <div className="relative w-full h-24 rounded-2xl overflow-hidden group cursor-pointer">
      <Image
        src={banner.imageUrl}
        alt={banner.title ?? 'Promoção'}
        fill sizes="100vw" unoptimized
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {(banner.title || banner.subtitle) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-4">
            {banner.title && (
              <p className="text-white font-bold text-sm leading-tight drop-shadow">{banner.title}</p>
            )}
            {banner.subtitle && (
              <p className="text-white/80 text-xs mt-0.5">{banner.subtitle}</p>
            )}
          </div>
        </>
      )}
    </div>
  )

  if (banner.link) {
    return (
      <a href={banner.link} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    )
  }

  return inner
}
