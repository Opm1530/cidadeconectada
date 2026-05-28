import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { api } from '@/lib/api'
import type { Order } from '@cc/shared'
import { ORDER_STATUS_LABEL, formatCurrency, formatDate } from '@cc/shared'

export default function PedidosScreen() {
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<{ data: Order[] }>('/api/orders'),
  })

  const orders = (data as unknown as { data: Order[] })?.data ?? []

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Pedidos</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#62a84a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/pedido/${item.id}`)}
            >
              <View style={styles.row}>
                <Text style={styles.number}>Pedido #{item.number}</Text>
                <Text style={[styles.status, getStatusStyle(item.status)]}>
                  {ORDER_STATUS_LABEL[item.status]}
                </Text>
              </View>
              <Text style={styles.company}>{item.company?.name}</Text>
              <View style={styles.row}>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.total}>{formatCurrency(item.total)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum pedido ainda</Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

function getStatusStyle(status: string) {
  const map: Record<string, object> = {
    DELIVERED: { color: '#16a34a', backgroundColor: '#f0fdf4' },
    CANCELLED: { color: '#dc2626', backgroundColor: '#fef2f2' },
    PAID: { color: '#2563eb', backgroundColor: '#eff6ff' },
  }
  return map[status] ?? { color: '#62a84a', backgroundColor: '#f0fdf4' }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 15, fontWeight: '600', color: '#111827' },
  status: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  company: { fontSize: 13, color: '#6b7280' },
  date: { fontSize: 12, color: '#9ca3af' },
  total: { fontSize: 15, fontWeight: '600', color: '#111827' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
})
