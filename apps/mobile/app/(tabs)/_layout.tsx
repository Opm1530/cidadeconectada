import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { Home, Search, Building2, User, Bike } from 'lucide-react-native'
import { useAuthStore } from '@/store/auth'

const ORANGE = '#f97316'
const GRAY   = '#9ca3af'

export default function TabsLayout() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isDriver   = user?.role === 'DELIVERY_DRIVER'
  const isMerchant = user?.role === 'COMPANY_OWNER'

  useEffect(() => {
    if (isMerchant) router.replace('/lojista/pedidos')
  }, [isMerchant])

  useEffect(() => {
    if (isDriver) router.replace('/(tabs)/entregas')
  }, [isDriver])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor:   ORANGE,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -3 },
            },
            android: { elevation: 8 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Home size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="pesquisar"
        options={{
          title: 'Pesquisar',
          tabBarIcon: ({ color }) => (
            <Search size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="cidade"
        options={{
          title: 'Prefeitura',
          tabBarIcon: ({ color }) => (
            <Building2 size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <User size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />

      {/* Ocultos do tab bar */}
      <Tabs.Screen
        name="entregas"
        options={{
          href: isDriver ? '/(tabs)/entregas' : null,
          tabBarIcon: ({ color }) => <Bike size={22} color={color} />,
          title: 'Entregas',
        }}
      />
      <Tabs.Screen name="carrinho" options={{ href: null }} />
      <Tabs.Screen name="pedidos"  options={{ href: null }} />
    </Tabs>
  )
}
