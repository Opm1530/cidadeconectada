import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/store/auth'

// URL do backend Next.js
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Injeta access token nas requisições
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('cc_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor de resposta: trata 401 fazendo refresh do token
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = await SecureStore.getItemAsync('cc_refresh')
        if (!refreshToken) throw new Error('Sem refresh token')

        // Envia o refresh token no body (não em cookie, que não funciona bem em mobile)
        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })

        const { accessToken, refreshToken: newRefresh } = res.data.data
        await SecureStore.setItemAsync('cc_access', accessToken)
        await SecureStore.setItemAsync('cc_refresh', newRefresh)

        // Repete a requisição original com o novo token
        error.config.headers.Authorization = `Bearer ${accessToken}`
        return apiClient.request(error.config)
      } catch {
        // Limpa tokens e atualiza o store → AuthGuard redireciona para login
        await useAuthStore.getState().logout()
      }
    }

    // Extrai mensagem de erro legível
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      'Erro desconhecido'
    return Promise.reject(new Error(message))
  },
)

export const api = {
  get:    <T>(path: string)                   => apiClient.get<{ data: T }>(path).then((r) => r.data.data),
  post:   <T>(path: string, body?: unknown)   => apiClient.post<{ data: T }>(path, body).then((r) => r.data.data),
  put:    <T>(path: string, body?: unknown)   => apiClient.put<{ data: T }>(path, body).then((r) => r.data.data),
  patch:  <T>(path: string, body?: unknown)   => apiClient.patch<{ data: T }>(path, body).then((r) => r.data.data),
  delete: <T>(path: string)                   => apiClient.delete<{ data: T }>(path).then((r) => r.data.data),
}
