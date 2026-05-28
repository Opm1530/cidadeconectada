import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { MapPin, ArrowRight, Store } from 'lucide-react-native'
import { useCityStore } from '@/store/city'
import { api } from '@/lib/api'

interface City {
  id: string
  slug: string
  name: string
  state: string
  _count?: { companies: number }
}

export default function SelecionarCidadeScreen() {
  const router = useRouter()
  const setCity = useCityStore((s) => s.setCity)

  const { data, isLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<City[]>('/api/cities'),
  })

  const cities = (data as unknown as City[]) ?? []

  async function handleSelect(city: City) {
    await setCity({
      id: city.id,
      slug: city.slug,
      name: city.name,
      state: city.state,
    })
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Store size={28} color="#fff" />
        </View>
        <Text style={styles.title}>Cidade Conectada</Text>
        <Text style={styles.subtitle}>Selecione sua cidade para continuar</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#62a84a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={cities}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const count = item._count?.companies ?? 0
            return (
              <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <View style={styles.cardLeft}>
                  <View style={styles.pinIcon}>
                    <MapPin size={18} color="#62a84a" />
                  </View>
                  <View>
                    <Text style={styles.cityName}>{item.name}</Text>
                    <Text style={styles.cityState}>
                      {item.state}{count > 0 ? ` · ${count} ${count === 1 ? 'loja' : 'lojas'}` : ''}
                    </Text>
                  </View>
                </View>
                <ArrowRight size={18} color="#d1d5db" />
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma cidade disponível ainda.</Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 32, paddingBottom: 24, gap: 8 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#62a84a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#62a84a',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cityState: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
})
