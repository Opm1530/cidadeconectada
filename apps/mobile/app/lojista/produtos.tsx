import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Switch,
} from 'react-native'
import { Text } from '@/components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Tag, Pencil, Trash2 } from 'lucide-react-native'
import { Image } from 'expo-image'
import { api } from '@/lib/api'
import { formatCurrency } from '@cc/shared'

const GREEN       = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'
const ORANGE      = '#f97316'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  type: 'PRODUCT' | 'SERVICE'
  active: boolean
  category: string | null
  _count?: { optionGroups: number }
}

interface MyCompany { id: string; slug: string }

export default function ProdutosScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: companyData } = useQuery<MyCompany>({
    queryKey: ['my-company'],
    queryFn: () => api.get('/api/companies/me'),
    staleTime: 60_000,
  })
  const company = companyData as unknown as MyCompany

  const { data: productsData, isLoading } = useQuery<Product[]>({
    queryKey: ['my-products', company?.id],
    queryFn: () => api.get(`/api/products?companyId=${company!.id}&all=true`),
    enabled: !!company?.id,
    staleTime: 0,
  })
  const products = (productsData as unknown as Product[]) ?? []

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/products/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-products'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o produto.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-products'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível excluir o produto.'),
  })

  function confirmDelete(product: Product) {
    Alert.alert(
      'Excluir produto',
      `Deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(product.id) },
      ],
    )
  }

  function goToEdit(id?: string) {
    if (id) router.push(`/lojista/produto?id=${id}`)
    else router.push('/lojista/produto')
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.centered} edges={['top']}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>Meus Produtos</Text>
          <Text style={s.subtitle}>{products.length} produto{products.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => goToEdit()} activeOpacity={0.85}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={s.empty}>
          <Package size={56} color="#e5e7eb" strokeWidth={1.5} />
          <Text style={s.emptyTitle}>Nenhum produto ainda</Text>
          <Text style={s.emptySub}>Toque no botão + para adicionar seu primeiro produto</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => goToEdit()} activeOpacity={0.85}>
            <Plus size={16} color="#fff" />
            <Text style={s.emptyBtnText}>Adicionar produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[s.card, !item.active && s.cardInactive]}>
              {/* Imagem ou ícone */}
              <View style={s.imgWrap}>
                {item.imageUrl
                  ? <Image source={{ uri: item.imageUrl }} style={s.img} contentFit="cover" />
                  : (
                    <View style={s.imgFallback}>
                      <Package size={24} color="#d1d5db" />
                    </View>
                  )
                }
              </View>

              {/* Info */}
              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                  <View style={[s.typeBadge, item.type === 'SERVICE' && s.typeBadgeService]}>
                    <Tag size={10} color={item.type === 'SERVICE' ? '#7c3aed' : '#059669'} />
                    <Text style={[s.typeText, item.type === 'SERVICE' && s.typeTextService]}>
                      {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                    </Text>
                  </View>
                </View>
                <Text style={s.price}>{formatCurrency(Number(item.price))}</Text>
                {item.description && (
                  <Text style={s.desc} numberOfLines={1}>{item.description}</Text>
                )}
              </View>

              {/* Ações */}
              <View style={s.actions}>
                <Switch
                  value={item.active}
                  onValueChange={(val) => toggleMutation.mutate({ id: item.id, active: val })}
                  trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }}
                  thumbColor={item.active ? GREEN : '#f3f4f6'}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <TouchableOpacity style={s.iconBtn} onPress={() => goToEdit(item.id)} activeOpacity={0.7}>
                  <Pencil size={15} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, s.iconBtnDanger]} onPress={() => confirmDelete(item)} activeOpacity={0.7}>
                  <Trash2 size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerLeft: { gap: 2 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9ca3af' },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },

  list: { padding: 16, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardInactive: { opacity: 0.55 },

  imgWrap: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgFallback: {
    width: '100%', height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },

  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  price: { fontSize: 15, fontWeight: '800', color: ORANGE },
  desc: { fontSize: 12, color: '#9ca3af' },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ecfdf5', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  typeBadgeService: { backgroundColor: '#f5f3ff' },
  typeText: { fontSize: 10, fontWeight: '600', color: '#059669' },
  typeTextService: { color: '#7c3aed' },

  actions: { alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: '#fef2f2' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151' },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
