import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface FavoritesState {
  productIds: string[]
  toggle: (id: string) => void
  isFavorite: (id: string) => boolean
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      productIds: [],

      toggle: (id) =>
        set(s => ({
          productIds: s.productIds.includes(id)
            ? s.productIds.filter(p => p !== id)
            : [...s.productIds, id],
        })),

      isFavorite: (id) => get().productIds.includes(id),
    }),
    {
      name: 'cc-favorites',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
