/**
 * Sincroniza o role do usuário com o banco de dados.
 *
 * Quando o app volta para o primeiro plano, compara o role armazenado
 * no JWT local com o role atual no servidor. Se divergirem (ex: admin
 * promoveu o usuário a entregador), força um refresh silencioso do token
 * e atualiza o Zustand — o AuthGuard redireciona automaticamente.
 */
import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function useSessionSync() {
  const { user, isLoggedIn, loadSession } = useAuthStore()
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const lastCheck = useRef<number>(0)

  useEffect(() => {
    if (!isLoggedIn) return

    async function checkAndSync() {
      const now = Date.now()
      // Evita verificar mais de uma vez a cada 30 segundos
      if (now - lastCheck.current < 30_000) return
      lastCheck.current = now

      try {
        const accessToken = await SecureStore.getItemAsync('cc_access')
        if (!accessToken) return

        // Busca o role atual do banco
        const res = await axios.get(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000,
        })

        const serverRole = res.data?.data?.role
        if (!serverRole) return

        // Role mudou → força refresh do token
        if (serverRole !== user?.role) {
          console.log(`[SessionSync] Role mudou: ${user?.role} → ${serverRole}. Renovando token…`)

          const refreshToken = await SecureStore.getItemAsync('cc_refresh')
          if (!refreshToken) return

          const refreshRes = await axios.post(
            `${BASE_URL}/api/auth/refresh`,
            { refreshToken },
            { timeout: 5000 },
          )

          const { accessToken: newAccess, refreshToken: newRefresh } = refreshRes.data.data
          await SecureStore.setItemAsync('cc_access', newAccess)
          await SecureStore.setItemAsync('cc_refresh', newRefresh)

          // Atualiza o store — AuthGuard vai redirecionar
          await loadSession()
        }
      } catch {
        // Falha silenciosa — não interrompe o usuário
      }
    }

    // Verifica imediatamente ao montar (se já estava logado)
    checkAndSync()

    // Verifica quando o app volta para o primeiro plano
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current !== 'active' && next === 'active') {
        checkAndSync()
      }
      appState.current = next
    })

    return () => sub.remove()
  }, [isLoggedIn, user?.role])
}
