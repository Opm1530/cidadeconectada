import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native'
import { Text } from '@/components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Heart, ShoppingBag, ChevronLeft } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useFavoritesStore } from '@/store/favorites'
import { formatCurrency } from '@cc/shared'
import { CategoryImages } from '@/lib/images'
import type { CategoryImageKey } from '@/lib/images'

const GREEN = '#62a84a'
const ORANGE = '#f97316'
const SCREEN_W = Dimensions.get('window').width
const CARD_W = Math.floor((SCREEN_W - 20 * 2 - 12) / 2)

const CATEGORY_COLORS: Record<string, [string, string]> = {
  Restaurante:   ['#fb923c', '#ef4444'],
  Lanchonete:    ['#fbbf24', '#f97316'],
  Pizzaria:      ['#f87171', '#e11d48'],
  Mercado:       ['#4ade80', '#0d9488'],
  'Farmácia':    ['#60a5fa', '#06b6d4'],
  Padaria:       ['#fcd34d', '#f59e0b'],
  'Açaí':        ['#a855f7', '#ec4899'],
  Sushi:         ['#2dd4bf', '#3b82f6'],
  Bebidas:       ['#38bdf8', '#0284c7'],
  Doceria:       ['#f472b6', '#fb7185'],
  Petshop:       ['#a3e635', '#10b981'],
  'Serviços':    ['#94a3b8', '#64748b'],
  Moda:          ['#e879f9', '#f43f5e'],
  'Eletrônicos': ['#818cf8', '#a855f7'],
  Hortifruti:    ['#86efac', '#22c55e'],
  Papelaria:     ['#fda4af', '#f43f5e'],
  Brinquedos:    ['#fdba74', '#f97316'],
}

const CAT_META: Record<string, { imageKey: CategoryImageKey }> = {
  Restaurante:   { imageKey: 'restaurante' },
  Lanchonete:    { imageKey: 'lanchonete'  },
  Pizzaria:      { imageKey: 'pizzaria'    },
  Mercado:       { imageKey: 'mercado'     },
  'Farmácia':    { imageKey: 'farmacia'    },
  Padaria:       { imageKey: 'padaria'     },
  'Açaí':        { imageKey: 'acai'        },
  Sushi:         { imageKey: 'sushi'       },
  Bebidas:       { imageKey: 'bebidas'     },
  Doceria:       { imageKey: 'doceria'     },
  Petshop:       { imageKey: 'petshop'     },
  'Serviços':    { imageKey: 'servicos'    },
  Moda:          { imageKey: 'moda'        },
  'Eletrônicos': { imageKey: 'eletronicos' },
  Hortifruti:    { imageKey: 'hortifruti'  },
  Papelaria:     { imageKey: 'papelaria'   },
  Brinquedos:    { imageKey: 'brinquedos'  },
}

function getColors(cat?: string | null): [string, string] {
  return cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : [ORANGE, '#ef4444']
}

interface FavoriteProduct {
  id: string
  name: string
  price: number
  imageUrl?: string | null
  company: { id: string; name: string; slug: string; category: string }
}

export default function FavoritosScreen() {
  const router = useRouter()
  const { productIds, toggle, isFavorite } = useFavoritesStore()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites', productIds.join(',')],
    queryFn: () => api.get<FavoriteProduct[]>(`/api/products?ids=${productIds.join(',')}`),
    enabled: productIds.length > 0,
  })

  const products = (data as unknown as FavoriteProduct[]) ?? []

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Favoritos</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Empty state */}
      {!isLoading && productIds.length === 0 && (
        <View style={styles.empty}>
          <Heart size={52} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
          <Text style={styles.emptySub}>
            Toque no ♡ de qualquer produto para salvá-lo aqui
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/')} activeOpacity={0.8}>
            <Text style={styles.exploreBtnText}>Explorar produtos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grid */}
      {(isLoading || products.length > 0) && (
        <FlatList
          data={isLoading ? (Array(productIds.length).fill(null) as null[]) : products}
          keyExtractor={(item, i) => (item ? item.id : String(i))}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (!item) {
              // skeleton
              return <View style={[styles.skeleton, { width: CARD_W }]} />
            }

            const colors = getColors(item.company?.category)
            const favorited = isFavorite(item.id)

            return (
              <TouchableOpacity
                style={[styles.card, { width: CARD_W }]}
                onPress={() => router.push(`/empresa/${item.company?.slug}?productId=${item.id}`)}
                activeOpacity={0.88}
              >
                <View style={[styles.imgWrap, { width: CARD_W, height: CARD_W }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.img} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={colors}
                      style={styles.imgFallback}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Image
                        source={CategoryImages[CAT_META[item.company?.category ?? '']?.imageKey ?? 'todas']}
                        style={{ width: 52, height: 52 }}
                        contentFit="contain"
                      />
                    </LinearGradient>
                  )}

                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => toggle(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.75}
                  >
                    <Heart
                      size={13}
                      color={favorited ? '#ef4444' : '#9ca3af'}
                      fill={favorited ? '#ef4444' : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  {item.company?.name && (
                    <Text style={styles.storeName} numberOfLines={1}>{item.company.name}</Text>
                  )}
                  <View style={styles.bottom}>
                    <Text style={styles.price}>{formatCurrency(Number(item.price))}</Text>
                    <View style={styles.cartBtn}>
                      <ShoppingBag size={13} color="#fff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  exploreBtn: {
    marginTop: 12, backgroundColor: GREEN,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  grid: { padding: 20, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },

  skeleton: { height: CARD_W + 90, borderRadius: 16, backgroundColor: '#f3f4f6' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  imgWrap: { position: 'relative', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },

  info: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, gap: 3 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  storeName: { fontSize: 11, color: '#9ca3af' },
  bottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  price: { fontSize: 14, fontWeight: '800', color: '#111827' },
  cartBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
})
