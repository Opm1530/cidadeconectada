import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { ShoppingBag, Package, Settings, User, Tag } from 'lucide-react-native'
import { useAuthStore } from '@/store/auth'

const GREEN = '#62a84a'
const GRAY  = '#9ca3af'

export default function LojistaLayout() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)

  // Guard: apenas COMPANY_OWNER pode acessar
  useEffect(() => {
    if (user && user.role !== 'COMPANY_OWNER') {
      router.replace('/(tabs)')
    }
  }, [user])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="produtos"
        options={{
          title: 'Produtos',
          tabBarIcon: ({ color }) => <Package size={22} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="cupons"
        options={{
          title: 'Cupons',
          tabBarIcon: ({ color }) => <Tag size={22} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Config.',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Minha Loja',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={1.5} />,
        }}
      />
      {/* Telas sem aba visível */}
      <Tabs.Screen name="produto" options={{ href: null }} />
    </Tabs>
  )
}
