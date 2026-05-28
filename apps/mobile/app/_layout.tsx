import { useEffect, useRef } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/auth'
import { useCityStore } from '@/store/city'
import { useSessionSync } from '@/hooks/useSessionSync'
import {
  registerPushToken,
  setupNotificationHandler,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from '@/lib/notifications'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
})

function AuthGuard() {
  const router = useRouter()
  const segments = useSegments()
  const { isLoggedIn, isLoaded: authLoaded, loadSession } = useAuthStore()
  const { city, isLoaded: cityLoaded, loadCity } = useCityStore()
  const responseListenerRef = useRef<unknown>(null)

  // Detecta mudança de role no servidor e renova o token automaticamente
  useSessionSync()

  useEffect(() => {
    loadSession()
    loadCity()
    setupNotificationHandler() // seguro — verifica Expo Go internamente
  }, [])

  // Registra push token quando o usuário faz login
  useEffect(() => {
    if (isLoggedIn) {
      registerPushToken()
    }
  }, [isLoggedIn])

  // Listener: toque em notificação abre tela correta
  useEffect(() => {
    addNotificationResponseListener((data, orderId) => {
      const screen = data.screen as string | undefined
      if (screen === 'entregas')                router.push('/(tabs)/entregas')
      else if (screen === 'pedidos' && orderId) router.push(`/pedido/${orderId}`)
      else if (screen === 'lojista-pedidos')    router.push('/lojista/pedidos')
      else if (screen === 'perfil')             router.push('/(tabs)/perfil')
    }).then((sub) => { responseListenerRef.current = sub })

    return () => {
      removeNotificationSubscription(responseListenerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!authLoaded || !cityLoaded) return

    const inAuth       = segments[0] === '(auth)'
    const inSelectCity = segments[0] === 'selecionar-cidade'

    if (!isLoggedIn && !inAuth) {
      router.replace('/(auth)/login')
      return
    }
    if (isLoggedIn && !city && !inSelectCity) {
      router.replace('/selecionar-cidade')
      return
    }
    if (isLoggedIn && city && (inAuth || inSelectCity)) {
      router.replace('/(tabs)')
    }
  }, [isLoggedIn, authLoaded, cityLoaded, city, segments])

  useEffect(() => {
    if (authLoaded && cityLoaded) SplashScreen.hideAsync()
  }, [authLoaded, cityLoaded])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  })

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/registro" />
            <Stack.Screen name="selecionar-cidade" />
            <Stack.Screen
              name="checkout"
              options={{ headerShown: true, title: 'Finalizar Pedido', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="empresa/[slug]"
              options={{ headerShown: true, title: '', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="pedido/[id]"
              options={{ headerShown: true, title: 'Meu Pedido', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen name="noticias/[id]"        options={{ headerShown: false }} />
            <Stack.Screen name="enquetes/[id]"        options={{ headerShown: false }} />
            <Stack.Screen name="entregador/cadastro"  options={{ headerShown: false }} />
            <Stack.Screen name="abrir-loja"            options={{ headerShown: false }} />
            <Stack.Screen name="lojas"                 options={{ headerShown: false }} />
            <Stack.Screen name="lojista"               options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
