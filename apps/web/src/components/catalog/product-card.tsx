import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@cc/shared'
import { Plus, UtensilsCrossed } from 'lucide-react'

interface ProductCardProps {
  product: {
    id: string
    name: string
    description: string | null
    price: number | string
    imageUrl?: string | null
  }
  company: {
    name: string
    slug: string
  }
  citySlug: string
}

export function ProductCard({ product, company, citySlug }: ProductCardProps) {
  return (
    <Link
      href={`/${citySlug}/empresa/${company.slug}`}
      className="group flex bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative w-28 h-28 shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="112px"
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <UtensilsCrossed size={32} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <p className="text-[11px] text-primary-600 font-semibold truncate mb-0.5">{company.name}</p>
          <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(product.price))}</span>
          <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors">
            <Plus size={14} className="text-white" />
          </div>
        </div>
      </div>
    </Link>
  )
}
