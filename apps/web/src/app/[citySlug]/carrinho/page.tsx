'use client'

import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@cc/shared'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CartBanner } from './cart-banner'

export default function CartPage() {
  const params = useParams<{ citySlug: string }>()
  const { cart, removeItem, updateQuantity, clearCart } = useCartStore()

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <ShoppingBag size={56} strokeWidth={1} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Carrinho vazio</h2>
        <p className="text-sm text-gray-400 mb-6">Adicione produtos de uma loja para continuar.</p>
        <Link href={`/${params.citySlug}`}>
          <Button>Ver lojas</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Carrinho</h1>
        <button
          onClick={clearCart}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
        >
          <Trash2 size={13} />
          Limpar
        </button>
      </div>

      {/* Nome da loja */}
      <p className="text-sm text-gray-500 mb-4">
        Loja: <span className="font-medium text-gray-800">{cart.companyName}</span>
      </p>

      {/* Itens */}
      <div className="flex flex-col gap-3 mb-6">
        {cart.items.map((item, idx) => (
          <div key={`${item.product.id}-${idx}`} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex gap-3">
              {/* Imagem */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {item.product.imageUrl ? (
                  <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="100vw" unoptimized className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                    Sem foto
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.product.name}</p>

                {/* Opções selecionadas */}
                {item.selectedOptions.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.selectedOptions.map((o) => o.optionName).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">"{item.notes}"</p>
                )}

                <div className="flex items-center justify-between mt-2">
                  {/* Quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      {item.quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Preço */}
                  <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Subtotal</span>
          <span>{formatCurrency(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400 mb-3">
          <span>Taxa de entrega</span>
          <span>calculada no checkout</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
          <span>Total estimado</span>
          <span>{formatCurrency(cart.subtotal)}</span>
        </div>
      </div>

      {/* Banner promocional no carrinho */}
      <CartBanner citySlug={params.citySlug} />

      <Link href={`/${params.citySlug}/checkout`} className="mt-4 block">
        <Button size="lg" className="w-full gap-2">
          Finalizar pedido
          <ArrowRight size={18} />
        </Button>
      </Link>
    </div>
  )
}
