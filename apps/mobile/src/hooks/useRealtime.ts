import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

interface UseRealtimeOptions {
  /** Chaves do React Query para invalidar quando qualquer evento chegar */
  invalidateKeys: string[][]
  /** Query params extras para o endpoint SSE (ex: { orderId: 'xxx' }) */
  params?: Record<string, string>
  /** Desativa o hook sem desmontar o componente */
  enabled?: boolean
}

/**
 * Hook de tempo real via SSE (Server-Sent Events).
 *
 * Conecta em /api/realtime e, ao receber qualquer evento, invalida as queries
 * especificadas em invalidateKeys, causando refetch imediato e silencioso.
 *
 * - Reconecta automaticamente com backoff exponencial (1s → 30s)
 * - Para quando o app vai para background; reconecta ao voltar para foreground
 * - Fallback: polling de 5s nas queries (configurado nos próprios useQuery)
 */
export function useRealtime({ invalidateKeys, params = {}, enabled = true }: UseRealtimeOptions) {
  const queryClient    = useQueryClient()
  const abortRef       = useRef<AbortController | null>(null)
  const retryDelay     = useRef(1000)
  const isMounted      = useRef(true)
  const paramsKey      = JSON.stringify(params)

  async function connect() {
    if (!enabled || !isMounted.current) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = await SecureStore.getItemAsync('cc_access')
      if (!token || controller.signal.aborted) return

      const qs = new URLSearchParams(params).toString()
      const url = `${BASE_URL}/api/realtime${qs ? `?${qs}` : ''}`

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE ${response.status}`)
      }

      // Conexão estabelecida — reseta o backoff
      retryDelay.current = 1000

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE usa blocos separados por \n\n
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))
              // Ignora evento de conexão inicial
              if (event.type === 'CONNECTED') continue
              // Invalida todas as queries especificadas → refetch imediato
              for (const key of invalidateKeys) {
                queryClient.invalidateQueries({ queryKey: key })
              }
            } catch { /* JSON malformado — ignora */ }
          }
        }
      }

      // Stream encerrou normalmente — agenda reconexão
      scheduleReconnect()
    } catch (err: unknown) {
      if (controller.signal.aborted) return // desconectado intencionalmente
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (!isMounted.current) return
    const delay = retryDelay.current
    retryDelay.current = Math.min(delay * 2, 30_000)
    setTimeout(connect, delay)
  }

  useEffect(() => {
    isMounted.current = true

    if (enabled) connect()

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        retryDelay.current = 1000
        connect()
      } else {
        // Background / inactive: desconecta para economizar bateria
        abortRef.current?.abort()
      }
    }

    const sub = AppState.addEventListener('change', handleAppState)

    return () => {
      isMounted.current = false
      abortRef.current?.abort()
      sub.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paramsKey])
}
