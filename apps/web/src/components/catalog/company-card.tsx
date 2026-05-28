import Link from 'next/link'
import Image from 'next/image'
import {
  Bike, Clock, Store,
  UtensilsCrossed, Sandwich, Pizza, ShoppingCart, Pill, Croissant,
  Grape, Fish, GlassWater, Cake, PawPrint, Wrench, Shirt, Smartphone, Leaf,
} from 'lucide-react'
import { formatCurrency } from '@cc/shared'
import type { Company } from '@cc/shared'

interface CompanyCardProps {
  company: Company & {
    hasOwnDelivery?: boolean
    ownDeliveryFee?: number | null
    acceptsPlatformDrivers?: boolean
    acceptsMercadoPago?: boolean
    acceptsPix?: boolean
    acceptsCashOnDelivery?: boolean
  }
  citySlug: string
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Restaurante': 'from-orange-400 via-orange-500 to-red-500',
  'Lanchonete':  'from-yellow-400 via-amber-400 to-orange-500',
  'Pizzaria':    'from-red-400 via-red-500 to-rose-600',
  'Mercado':     'from-green-400 via-emerald-500 to-teal-600',
  'Farmácia':    'from-blue-400 via-blue-500 to-cyan-600',
  'Padaria':     'from-amber-300 via-amber-400 to-yellow-500',
  'Açaí':        'from-purple-500 via-violet-500 to-pink-500',
  'Sushi':       'from-teal-400 via-cyan-500 to-blue-500',
  'Bebidas':     'from-cyan-400 via-sky-500 to-blue-500',
  'Doceria':     'from-pink-400 via-rose-400 to-pink-500',
  'Petshop':     'from-lime-400 via-green-500 to-emerald-500',
  'Serviços':    'from-slate-400 via-gray-500 to-slate-600',
  'Moda':        'from-fuchsia-400 via-pink-500 to-rose-500',
  'Eletrônicos': 'from-indigo-400 via-violet-500 to-purple-600',
}

function getGradient(category?: string | null) {
  if (category && CATEGORY_GRADIENTS[category]) return CATEGORY_GRADIENTS[category]
  return 'from-primary-500 via-primary-600 to-purple-600'
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  'Restaurante': UtensilsCrossed,
  'Lanchonete':  Sandwich,
  'Pizzaria':    Pizza,
  'Mercado':     ShoppingCart,
  'Farmácia':    Pill,
  'Padaria':     Croissant,
  'Açaí':        Grape,
  'Sushi':       Fish,
  'Bebidas':     GlassWater,
  'Doceria':     Cake,
  'Petshop':     PawPrint,
  'Serviços':    Wrench,
  'Moda':        Shirt,
  'Eletrônicos': Smartphone,
  'Hortifruti':  Leaf,
}

export function CompanyCard({ company, citySlug }: CompanyCardProps) {
  const hasDelivery = company.hasOwnDelivery || company.acceptsPlatformDrivers
  const gradient = getGradient(company.category)
  const CatIcon = company.category ? (CATEGORY_ICON[company.category] ?? Store) : Store

  return (
    <Link
      href={`/${citySlug}/empresa/${company.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      {/* Cover — sem overflow-hidden para o logo não ser cortado */}
      <div className={`relative w-full h-36 bg-gradient-to-br ${gradient}`}>
        {/* Imagem tem overflow próprio */}
        {company.coverUrl ? (
          <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
            <Image
              src={company.coverUrl}
              alt={company.name}
              fill
              sizes="400px"
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          /* Placeholder com padrão visual */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-40 rounded-t-2xl">
            <CatIcon size={48} className="text-white" />
          </div>
        )}

        {/* Gradient overlay bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-t-2xl" />

        {/* Category pill top-left */}
        {company.category && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/30">
              <CatIcon size={10} />
              {company.category}
            </span>
          </div>
        )}

        {/* Delivery tag top-right */}
        {hasDelivery && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full">
              <Bike size={9} />
              {company.hasOwnDelivery && company.ownDeliveryFee
                ? formatCurrency(Number(company.ownDeliveryFee))
                : 'Entrega'}
            </span>
          </div>
        )}

        {/* Logo floating — posicionado fora do overflow da imagem */}
        <div className="absolute -bottom-5 left-3 z-10">
          <div className="w-11 h-11 rounded-xl border-2 border-white bg-white shadow-lg overflow-hidden">
            {company.logoUrl ? (
              <Image src={company.logoUrl} alt={company.name} width={44} height={44} unoptimized className="object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-white text-lg font-black">{company.name[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-7 px-3 pb-3 flex flex-col gap-1.5 flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 group-hover:text-primary-600 transition-colors">
          {company.name}
        </h3>

        {company.description && (
          <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed">{company.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Clock size={10} />
            <span>20–40 min</span>
          </div>
          <div className="flex items-center gap-1">
            {company.acceptsPix && (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">Pix</span>
            )}
            {company.acceptsCashOnDelivery && (
              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">Dinheiro</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
