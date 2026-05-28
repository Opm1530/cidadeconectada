import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cart, CartItem, CartItemOption, Product } from '@cc/shared'
import { calcCartSubtotal } from '@cc/shared'

interface CartStore {
  cart: Cart | null
  addItem: (
    product: Product,
    quantity: number,
    selectedOptions: CartItemOption[],
    notes?: string,
    companyId?: string,
    companyName?: string,
    cityId?: string,
  ) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: null,

      addItem: (product, quantity, selectedOptions, notes, companyId, companyName, cityId) => {
        const { cart } = get()

        // Se o carrinho tem produtos de outra empresa → limpa automaticamente
        if (cart && cart.companyId !== (companyId ?? product.companyId)) {
          set({ cart: null })
        }

        const unitPrice =
          Number(product.price) +
          selectedOptions.reduce((acc, opt) => acc + opt.priceAdd, 0)

        const newItem: CartItem = {
          product,
          quantity,
          selectedOptions,
          notes,
          unitPrice,
          totalPrice: unitPrice * quantity,
        }

        set((state) => {
          const currentCart = state.cart
          const existingIndex = currentCart?.items.findIndex(
            (i) => i.product.id === product.id,
          ) ?? -1

          let items: CartItem[]
          if (currentCart && existingIndex >= 0) {
            items = currentCart.items.map((item, idx) =>
              idx === existingIndex ? newItem : item,
            )
          } else {
            items = [...(currentCart?.items ?? []), newItem]
          }

          const subtotal = calcCartSubtotal(items)

          return {
            cart: {
              companyId: companyId ?? product.companyId,
              companyName: companyName ?? '',
              cityId: cityId ?? '',
              items,
              subtotal,
            },
          }
        })
      },

      removeItem: (productId) => {
        set((state) => {
          if (!state.cart) return state
          const items = state.cart.items.filter((i) => i.product.id !== productId)
          if (items.length === 0) return { cart: null }
          return {
            cart: { ...state.cart, items, subtotal: calcCartSubtotal(items) },
          }
        })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => {
          if (!state.cart) return state
          const items = state.cart.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
              : item,
          )
          return {
            cart: { ...state.cart, items, subtotal: calcCartSubtotal(items) },
          }
        })
      },

      clearCart: () => set({ cart: null }),
    }),
    { name: 'cc-cart' },
  ),
)
