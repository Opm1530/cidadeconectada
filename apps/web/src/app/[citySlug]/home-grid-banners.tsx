import Image from 'next/image'
import { cn } from '@/lib/cn'

interface GridBanner {
  id: string
  imageUrl: string
  title: string | null
  subtitle: string | null
  link: string | null
}

interface Props {
  banners: GridBanner[]
}

export function HomeGridBanners({ banners }: Props) {
  if (banners.length === 0) return null

  // Layout adapta conforme quantidade: 1=full, 2=metade, 3=dois+um
  const count = banners.length

  return (
    <section>
      <div
        className={cn(
          'grid gap-3',
          count === 1 && 'grid-cols-1',
          count === 2 && 'grid-cols-1 sm:grid-cols-2',
          count === 3 && 'grid-cols-1 sm:grid-cols-3',
        )}
      >
        {banners.map((banner, i) => {
          const inner = (
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-2xl bg-gray-100 group',
                // Banner único fica mais alto
                count === 1 ? 'h-40' : 'h-32 sm:h-36',
              )}
            >
              <Image
                src={banner.imageUrl}
                alt={banner.title ?? `Banner ${i + 1}`}
                fill sizes="100vw" unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Overlay escuro quando tem texto */}
              {(banner.title || banner.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              )}
              {/* Texto */}
              {(banner.title || banner.subtitle) && (
                <div className="absolute bottom-0 left-0 p-3">
                  {banner.title && (
                    <p className="text-white font-bold text-sm leading-tight drop-shadow">{banner.title}</p>
                  )}
                  {banner.subtitle && (
                    <p className="text-white/80 text-xs mt-0.5 leading-tight">{banner.subtitle}</p>
                  )}
                </div>
              )}
            </div>
          )

          return banner.link ? (
            <a key={banner.id} href={banner.link} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          ) : (
            <div key={banner.id}>{inner}</div>
          )
        })}
      </div>
    </section>
  )
}
