'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@cc/shared'
import { api } from '@/lib/api-client'

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: false,

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ loading: true })
        try {
          const data = await api.post<{ user: AuthUser }>('/api/auth/login', { email, password })
          set({ user: data.user })
          return data.user
        } finally {
          set({ loading: false })
        }
      },

      logout: async () => {
        await api.post('/api/auth/logout', {})
        set({ user: null })
      },

      fetchMe: async () => {
        try {
          const data = await api.get<{ user: AuthUser }>('/api/auth/me')
          set({ user: data.user })
        } catch {
          set({ user: null })
        }
      },
    }),
    {
      name: 'cc-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
