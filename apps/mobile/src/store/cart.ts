import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface CartOption {
  id: string
  name: string
  priceAdd: number
}

export interface CartItem {
  id: string
  productId: string
  name: string
  unitPrice: number
  quantity: number
  notes?: string
  options?: CartOption[]
}

interface CartState {
  items: CartItem[]
  companyId: string | null
  companyName: string | null
  companySlug: string | null
  addItem: (item: CartItem, companyId: string, companyName: string, companySlug: string) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clear: () => void
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      companyId: null,
      companyName: null,
      companySlug: null,

      addItem: (item, companyId, companyName, companySlug) => {
        const state = get()
        // Clear cart if switching companies
        if (state.companyId && state.companyId !== companyId) {
          set({ items: [item], companyId, companyName, companySlug })
          return
        }

        const existing = state.items.find((i) => i.id === item.id)
        if (existing) {
          set({
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
            ),
            companyId,
            companyName,
            companySlug,
          })
        } else {
          set({ items: [...state.items, item], companyId, companyName, companySlug })
        }
      },

      removeItem: (id) =>
        set((s) => {
          const items = s.items.filter((i) => i.id !== id)
          return {
            items,
            companyId: items.length ? s.companyId : null,
            companyName: items.length ? s.companyName : null,
            companySlug: items.length ? s.companySlug : null,
          }
        }),

      updateQuantity: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id)
          return
        }
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)) }))
      },

      clear: () => set({ items: [], companyId: null, companyName: null, companySlug: null }),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    }),
    {
      name: 'cc-cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
