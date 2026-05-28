import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@cc/shared'
import { Minus, Plus, Trash2, ShoppingBag, ChevronLeft } from 'lucide-react-native'
import { useRouter } from 'expo-router'

export default function CarrinhoScreen() {
  const router = useRouter()
  const { items, companyName, updateQuantity, removeItem, clear, subtotal } = useCartStore()

  function confirmClear() {
    Alert.alert('Limpar carrinho', 'Tem certeza que deseja remover todos os itens?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: clear },
    ])
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Carrinho</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.empty}>
          <ShoppingBag size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptySubtitle}>Adicione itens de uma loja para começar</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/')}>
            <Text style={styles.browseBtnText}>Ver lojas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Carrinho</Text>
        <TouchableOpacity onPress={confirmClear}>
          <Text style={styles.clearBtn}>Limpar</Text>
        </TouchableOpacity>
      </View>

      {companyName && (
        <View style={styles.companyBanner}>
          <Text style={styles.companyBannerText}>{companyName}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.itemName}>{item.name}</Text>
              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}

            {item.options && item.options.length > 0 && (
              <Text style={styles.options}>
                {item.options.map((o) => o.name).join(', ')}
              </Text>
            )}

            <View style={styles.cardBottom}>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus size={14} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus size={14} color="#374151" />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal())}</Text>
        </View>
        <Text style={styles.footerNote}>Frete calculado no checkout</Text>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout')}
        >
          <Text style={styles.checkoutBtnText}>Ir para o checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  clearBtn: { fontSize: 14, color: '#ef4444' },
  companyBanner: { backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d1f0c8' },
  companyBannerText: { fontSize: 13, color: '#3d6b2e', fontWeight: '500' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  notes: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  options: { fontSize: 12, color: '#6b7280' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: 15, fontWeight: '600', color: '#111827', minWidth: 20, textAlign: 'center' },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#111827' },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 16,
    gap: 4,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 15, color: '#374151' },
  totalValue: { fontSize: 17, fontWeight: '700', color: '#111827' },
  footerNote: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  checkoutBtn: {
    backgroundColor: '#62a84a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  browseBtn: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#c5e3bb',
  },
  browseBtnText: { fontSize: 14, fontWeight: '600', color: '#62a84a' },
})
