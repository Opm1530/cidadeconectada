import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export type UserRole = 'SUPER_ADMIN' | 'CITY_ADMIN' | 'COMPANY_OWNER' | 'CUSTOMER' | 'DELIVERY_DRIVER'

interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  cityId?: string | null
  avatarUrl?: string | null
}

interface AuthState {
  user: AuthUser | null
  isLoggedIn: boolean
  isLoaded: boolean
  loadSession: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  setAvatarUrl: (url: string | null) => void
  logout: () => Promise<void>
}

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    const u = payload.user ?? payload
    if (!u?.id || !u?.role) return null
    return { id: u.id, name: u.name ?? '', email: u.email ?? '', role: u.role, cityId: u.cityId }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoaded: false,

  loadSession: async () => {
    const token = await SecureStore.getItemAsync('cc_access')
    if (!token) {
      set({ user: null, isLoggedIn: false, isLoaded: true })
      return
    }
    const user = decodeJwtPayload(token)
    set({ user, isLoggedIn: !!user, isLoaded: true })
  },

  setUser: (user) => set({ user, isLoggedIn: !!user }),

  setAvatarUrl: (url) => set((s) => ({
    user: s.user ? { ...s.user, avatarUrl: url } : null,
  })),

  logout: async () => {
    await SecureStore.deleteItemAsync('cc_access')
    await SecureStore.deleteItemAsync('cc_refresh')
    set({ user: null, isLoggedIn: false })
  },
}))
