'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  Search, X, Store, UtensilsCrossed, Sandwich, Pizza,
  ShoppingCart, Pill, Croissant, Grape, Fish, GlassWater,
  Cake, PawPrint, Wrench, Shirt, Smartphone, Leaf, IceCream,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/cn'

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  'Restaurante':  { icon: UtensilsCrossed, bg: 'bg-orange-50',  text: 'text-orange-600'  },
  'Lanchonete':   { icon: Sandwich,        bg: 'bg-yellow-50',  text: 'text-yellow-700'  },
  'Pizzaria':     { icon: Pizza,           bg: 'bg-red-50',     text: 'text-red-600'     },
  'Mercado':      { icon: ShoppingCart,    bg: 'bg-green-50',   text: 'text-green-700'   },
  'Farmácia':     { icon: Pill,            bg: 'bg-blue-50',    text: 'text-blue-600'    },
  'Padaria':      { icon: Croissant,       bg: 'bg-amber-50',   text: 'text-amber-700'   },
  'Açaí':         { icon: Grape,           bg: 'bg-purple-50',  text: 'text-purple-600'  },
  'Sushi':        { icon: Fish,            bg: 'bg-teal-50',    text: 'text-teal-600'    },
  'Bebidas':      { icon: GlassWater,      bg: 'bg-cyan-50',    text: 'text-cyan-600'    },
  'Doceria':      { icon: Cake,            bg: 'bg-pink-50',    text: 'text-pink-600'    },
  'Petshop':      { icon: PawPrint,        bg: 'bg-lime-50',    text: 'text-lime-700'    },
  'Serviços':     { icon: Wrench,          bg: 'bg-slate-50',   text: 'text-slate-600'   },
  'Moda':         { icon: Shirt,           bg: 'bg-fuchsia-50', text: 'text-fuchsia-600' },
  'Eletrônicos':  { icon: Smartphone,      bg: 'bg-indigo-50',  text: 'text-indigo-600'  },
  'Hortifruti':   { icon: Leaf,            bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Sorveteria':   { icon: IceCream,        bg: 'bg-sky-50',     text: 'text-sky-600'     },
}

interface CatalogSearchProps {
  citySlug: string
  categories: string[]
  currentCategory?: string
  currentQ?: string
}

export function CatalogSearch({ citySlug, categories, currentCategory, currentQ }: CatalogSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(currentQ ?? '')

  const navigate = useCallback((params: { q?: string; categoria?: string }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.categoria) sp.set('categoria', params.categoria)
    const qs = sp.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ''}`)
  }, [pathname, router])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ q, categoria: currentCategory })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar lojas ou serviços..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 shadow-sm"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); navigate({ categoria: currentCategory }) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-5 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
        >
          Buscar
        </button>
      </form>

      {/* Category cards — horizontal scroll */}
      {categories.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4">
          {/* "Todas" card */}
          <button
            onClick={() => navigate({ q: currentQ })}
            className="shrink-0 flex flex-col items-center gap-2 w-20 transition-all"
          >
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm',
              !currentCategory
                ? 'bg-primary-600 shadow-primary-200 shadow-md ring-2 ring-primary-600 ring-offset-2'
                : 'bg-gray-100 hover:bg-gray-200',
            )}>
              <Store size={24} className={!currentCategory ? 'text-white' : 'text-gray-500'} />
            </div>
            <span className={cn(
              'text-[11px] font-semibold text-center leading-tight',
              !currentCategory ? 'text-primary-600' : 'text-gray-500',
            )}>
              Todas
            </span>
          </button>

          {categories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat]
            const isActive = currentCategory === cat
            const Icon = cfg?.icon ?? Store
            return (
              <button
                key={cat}
                onClick={() => navigate({ q: currentQ, categoria: isActive ? undefined : cat })}
                className="shrink-0 flex flex-col items-center gap-2 w-20 transition-all"
              >
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm',
                  isActive
                    ? 'bg-primary-600 shadow-primary-200 shadow-md ring-2 ring-primary-600 ring-offset-2'
                    : cfg ? `${cfg.bg} hover:opacity-80` : 'bg-gray-100 hover:bg-gray-200',
                )}>
                  <Icon
                    size={24}
                    className={isActive ? 'text-white' : (cfg?.text ?? 'text-gray-500')}
                  />
                </div>
                <span className={cn(
                  'text-[11px] font-semibold text-center leading-tight',
                  isActive ? 'text-primary-600' : 'text-gray-500',
                )}>
                  {cat}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
