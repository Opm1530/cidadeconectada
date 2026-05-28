'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ShoppingCart, Package } from 'lucide-react'
import { ProductModal } from '@/components/catalog/product-modal'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@cc/shared'
import type { Product } from '@cc/shared'
import Link from 'next/link'
import { cn } from '@/lib/cn'

interface CompanyInfo {
  id: string
  name: string
  cityId: string
  citySlug: string
  acceptsMercadoPago: boolean
  acceptsPix: boolean
  acceptsCashOnDelivery: boolean
  hasOwnDelivery: boolean
  acceptsPlatformDrivers: boolean
  ownDeliveryFee: number | null
}

interface CompanyMenuProps {
  company: CompanyInfo
  products: Product[]
}

export function CompanyMenu({ company, products }: CompanyMenuProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const cart = useCartStore((s) => s.cart)
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})

  const cartCount = cart?.companyId === company.id
    ? cart.items.reduce((acc, i) => acc + i.quantity, 0)
    : 0

  const cartTotal = cart?.companyId === company.id ? cart.subtotal : 0

  // Extrai categorias únicas dos produtos
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean) as string[])
  )
  const hasCategories = categories.length > 0

  // Separa produtos por tipo
  const physicalProducts = products.filter((p) => p.type === 'PRODUCT')
  const services = products.filter((p) => p.type === 'SERVICE')

  // Filtra por categoria selecionada
  const filteredProducts = activeCategory === 'all'
    ? physicalProducts
    : physicalProducts.filter((p) => p.category === activeCategory)

  function scrollToCategory(cat: string) {
    setActiveCategory(cat)
    const el = categoryRefs.current[cat]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <Package size={40} strokeWidth={1} />
        <p className="text-sm">Esta loja ainda não possui produtos cadastrados.</p>
      </div>
    )
  }

  // Agrupa produtos filtrados por categoria para exibição
  const grouped: { label: string; items: Product[] }[] = hasCategories && activeCategory === 'all'
    ? categories.map((cat) => ({
        label: cat,
        items: physicalProducts.filter((p) => p.category === cat),
      })).concat(
        physicalProducts.filter((p) => !p.category).length > 0
          ? [{ label: 'Outros', items: physicalProducts.filter((p) => !p.category) }]
          : []
      )
    : [{ label: '', items: filteredProducts }]

  return (
    <>
      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="sticky top-14 z-30 bg-white border-b border-gray-100 px-4 py-2">
          <Link
            href={`/${company.citySlug}/carrinho`}
            className="flex items-center justify-between bg-primary-600 text-white px-4 py-3 rounded-xl"
          >
            <span className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
              <span className="text-sm font-medium">Ver carrinho</span>
            </span>
            <span className="font-semibold">{formatCurrency(cartTotal)}</span>
          </Link>
        </div>
      )}

      {/* Filtro de categorias */}
      {hasCategories && (
        <div className="sticky top-[calc(3.5rem+1px)] z-20 bg-white border-b border-gray-100">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeCategory === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              Tudo
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={cn(
                  'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                  activeCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col gap-6">
        {/* Produtos agrupados por categoria */}
        {grouped.map(({ label, items }) => (
          items.length > 0 && (
            <section
              key={label || 'all'}
              ref={(el) => { if (label) categoryRefs.current[label] = el }}
            >
              {label && (
                <h2 className="text-base font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  {label}
                </h2>
              )}
              <div className="flex flex-col gap-2">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
                ))}
              </div>
            </section>
          )
        ))}

        {/* Serviços */}
        {services.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
              Serviços
            </h2>
            <div className="flex flex-col gap-2">
              {services.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
              ))}
            </div>
          </section>
        )}

        {filteredProducts.length === 0 && activeCategory !== 'all' && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Nenhum produto nessa categoria.
          </div>
        )}

        {/* Formas de pagamento */}
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Formas de pagamento</p>
          <div className="flex flex-wrap gap-2">
            {company.acceptsMercadoPago && (
              <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">Mercado Pago</span>
            )}
            {company.acceptsPix && (
              <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full">Pix</span>
            )}
            {company.acceptsCashOnDelivery && (
              <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full">Pagamento na entrega</span>
            )}
          </div>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        companyId={company.id}
        companyName={company.name}
        cityId={company.cityId}
        citySlug={company.citySlug}
      />
    </>
  )
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <button
      onClick={() => onSelect(product)}
      className={cn(
        'flex items-center gap-3 w-full text-left p-3 rounded-xl border border-gray-100',
        'hover:border-primary-200 hover:shadow-sm transition-all bg-white group',
      )}
    >
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill sizes="100vw" unoptimized className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingCart size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors truncate">
          {product.name}
        </p>
        {product.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <p className="text-sm font-bold text-primary-600 mt-1.5">{formatCurrency(product.price)}</p>
      </div>

      <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 group-hover:bg-primary-700 transition-colors">
        <span className="text-lg leading-none font-light">+</span>
      </div>
    </button>
  )
}
