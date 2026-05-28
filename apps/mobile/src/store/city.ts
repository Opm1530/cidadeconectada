import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface SelectedCity {
  id: string
  slug: string
  name: string
  state: string
}

interface CityState {
  city: SelectedCity | null
  isLoaded: boolean
  loadCity: () => Promise<void>
  setCity: (city: SelectedCity) => Promise<void>
  clearCity: () => Promise<void>
}

const CITY_KEY = 'cc_selected_city'

export const useCityStore = create<CityState>((set) => ({
  city: null,
  isLoaded: false,

  loadCity: async () => {
    const raw = await SecureStore.getItemAsync(CITY_KEY)
    const city = raw ? JSON.parse(raw) : null
    set({ city, isLoaded: true })
  },

  setCity: async (city) => {
    await SecureStore.setItemAsync(CITY_KEY, JSON.stringify(city))
    set({ city })
  },

  clearCity: async () => {
    await SecureStore.deleteItemAsync(CITY_KEY)
    set({ city: null })
  },
}))
