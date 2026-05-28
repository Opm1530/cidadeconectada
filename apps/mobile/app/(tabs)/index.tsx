import {
  View, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Dimensions, RefreshControl, Linking,
} from 'react-native'
import { Text } from '@/components/Text'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, ShoppingBag, Star, Bike, MapPin, Heart } from 'lucide-react-native'
import { CategoryImages, HeroImage } from '@/lib/images'
import type { CategoryImageKey } from '@/lib/images'
import { useState, useMemo, useCallback } from 'react'
import { api } from '@/lib/api'
import { useCityStore } from '@/store/city'
import { useCartStore } from '@/store/cart'
import { useFavoritesStore } from '@/store/favorites'
import { formatCurrency } from '@cc/shared'
import type { Company } from '@cc/shared'

const { width: SW } = Dimensions.get('window')
const ORANGE = '#f97316'
const ORANGE_LIGHT = '#fff7ed'
const GREEN = '#62a84a'
const GREEN_DARK = '#4a7e38'

// ── Cores por categoria ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, [string, string]> = {
  Restaurante: ['#fb923c', '#ef4444'],
  Lanchonete: ['#fbbf24', '#f97316'],
  Pizzaria: ['#f87171', '#e11d48'],
  Mercado: ['#4ade80', '#0d9488'],
  'Farmácia': ['#60a5fa', '#06b6d4'],
  Padaria: ['#fcd34d', '#f59e0b'],
  'Açaí': ['#a855f7', '#ec4899'],
  Sushi: ['#2dd4bf', '#3b82f6'],
  Bebidas: ['#38bdf8', '#0284c7'],
  Doceria: ['#f472b6', '#fb7185'],
  Petshop: ['#a3e635', '#10b981'],
  'Serviços': ['#94a3b8', '#64748b'],
  Moda: ['#e879f9', '#f43f5e'],
  'Eletrônicos': ['#818cf8', '#a855f7'],
  Hortifruti:    ['#86efac', '#22c55e'],
  Papelaria:     ['#fda4af', '#f43f5e'],
  Brinquedos:    ['#fdba74', '#f97316'],
}

const CAT_META: Record<string, { label: string; imageKey: CategoryImageKey }> = {
  Restaurante:   { label: 'Restaurante', imageKey: 'restaurante' },
  Lanchonete:    { label: 'Lanche',      imageKey: 'lanchonete'  },
  Pizzaria:      { label: 'Pizza',       imageKey: 'pizzaria'    },
  Mercado:       { label: 'Mercado',     imageKey: 'mercado'     },
  'Farmácia':    { label: 'Farmácia',    imageKey: 'farmacia'    },
  Padaria:       { label: 'Padaria',     imageKey: 'padaria'     },
  'Açaí':        { label: 'Açaí',        imageKey: 'acai'        },
  Sushi:         { label: 'Sushi',       imageKey: 'sushi'       },
  Bebidas:       { label: 'Bebidas',     imageKey: 'bebidas'     },
  Doceria:       { label: 'Doces',       imageKey: 'doceria'     },
  Petshop:       { label: 'Pet',         imageKey: 'petshop'     },
  'Serviços':    { label: 'Serviços',    imageKey: 'servicos'    },
  Moda:          { label: 'Moda',        imageKey: 'moda'        },
  'Eletrônicos': { label: 'Tech',        imageKey: 'eletronicos' },
  Hortifruti:    { label: 'Hortifruti',  imageKey: 'hortifruti'  },
  Papelaria:     { label: 'Papelaria',   imageKey: 'papelaria'   },
  Brinquedos:    { label: 'Brinquedos',  imageKey: 'brinquedos'  },
}

function getColors(cat?: string | null): [string, string] {
  return cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : [ORANGE, '#ef4444']
}

// ── Card de produto (100% baseado no design de referência) ────────────────────

// ProductCard agora usa o mesmo design do ProductGridCard
// (alias para reutilização na seção Populares)
function ProductCard({ product }: { product: any }) {
  return <ProductGridCard product={product} />
}

// ── Card de produto em destaque (carrossel horizontal) ────────────────────────

const PG_W = 160   // largura fixa do card (carrossel)
const PG_IMG = 160 // imagem quadrada 1:1

// Largura do card no grid de destaque: ocupa metade da tela com margens simétricas
const SCREEN_W   = Dimensions.get('window').width
const FEATURED_W = Math.floor((SCREEN_W - 20 * 2 - 12) / 2) // padding 20 cada lado + gap 12

function ProductGridCard({ product, width }: { product: any; width?: number }) {
  const router    = useRouter()
  const category  = product.company?.category
  const colors    = getColors(category)
  const toggle    = useFavoritesStore(s => s.toggle)
  const favorited = useFavoritesStore(s => s.isFavorite(product.id))

  const cardW = width ?? PG_W

  return (
    <TouchableOpacity
      style={[pg.card, { width: cardW }]}
      onPress={() => router.push(`/empresa/${product.company?.slug}?productId=${product.id}`)}
      activeOpacity={0.88}
    >
      {/* ── Imagem com badges overlay ── */}
      <View style={[pg.imgWrap, { width: cardW, height: cardW }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={pg.img} contentFit="cover" />
        ) : (
          <LinearGradient colors={colors} style={pg.imgFallback} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Image
              source={CategoryImages[CAT_META[category ?? '']?.imageKey ?? 'todas']}
              style={{ width: 52, height: 52 }}
              contentFit="contain"
            />
          </LinearGradient>
        )}

        {/* Badge de desconto */}
        {!!product.discountPercent && (
          <View style={pg.discountBadge}>
            <Text style={pg.discountText}>{product.discountPercent}% Off</Text>
          </View>
        )}

        {/* Botão favorito */}
        <TouchableOpacity
          style={pg.heartBtn}
          onPress={() => toggle(product.id)}
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

      {/* ── Informações ── */}
      <View style={pg.info}>
        <Text style={pg.name} numberOfLines={2}>{product.name}</Text>
        {product.company?.name && (
          <Text style={pg.storeName} numberOfLines={1}>{product.company.name}</Text>
        )}
        <View style={pg.bottom}>
          <Text style={pg.price}>{formatCurrency(Number(product.price))}</Text>
          <View style={pg.cartBtn}>
            <ShoppingBag size={13} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Card de loja (horizontal strip abaixo da seção principal) ─────────────────

function CompanyChip({ company }: { company: any }) {
  const router = useRouter()
  const meta = company.category ? CAT_META[company.category] : null
  const colors = getColors(company.category)

  return (
    <TouchableOpacity
      style={chip.card}
      onPress={() => router.push(`/empresa/${company.slug}`)}
      activeOpacity={0.88}
    >
      <View style={chip.iconWrap}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        {company.logoUrl ? (
          <Image source={{ uri: company.logoUrl }} style={chip.logo} contentFit="cover" />
        ) : (
          <Image
            source={meta?.imageKey ? CategoryImages[meta.imageKey] : CategoryImages.todas}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
          />
        )}
      </View>
      <View style={chip.body}>
        <Text style={chip.name} numberOfLines={1}>{company.name}</Text>
        <Text style={chip.cat} numberOfLines={1}>{meta?.label ?? company.category ?? 'Loja'}</Text>
      </View>
      {(company.hasOwnDelivery || company.acceptsPlatformDrivers) && (
        <View style={chip.delivBadge}>
          <Bike size={10} color={ORANGE} />
          <Text style={chip.delivText}>Entrega</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { city } = useCityStore()
  const cartItems = useCartStore(s => s.items)
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // ── Banner hero
  const { data: bannersData } = useQuery({
    queryKey: ['banners-hero', city?.slug],
    queryFn: () => api.get<any[]>(`/api/cities/${city!.slug}/banners?type=CITY_HERO`),
    enabled: !!city,
  })
  const banners: any[] = (bannersData as unknown as any[]) ?? []
  const heroBanner = banners[0] ?? null

  // ── Banners promocionais (carrossel abaixo das categorias)
  const { data: promoBannersData, refetch: refetchPromo } = useQuery({
    queryKey: ['banners-promo', city?.slug],
    queryFn: () => api.get<any[]>(`/api/cities/${city!.slug}/banners?type=PROMO_CAROUSEL`),
    enabled: !!city,
  })
  const promoBanners: any[] = (promoBannersData as unknown as any[]) ?? []

  // ── Lojas (todas, só para montar o carrossel de categorias)
  const { data: allCompaniesData, refetch: refetchAllCompanies } = useQuery({
    queryKey: ['companies-all', city?.id],
    queryFn: () => api.get<{ data: Company[] }>(`/api/companies?cityId=${city!.id}`),
    enabled: !!city,
    staleTime: 0,
  })

  // ── Lojas filtradas pela categoria selecionada
  const { data: companiesData, isLoading: companiesLoading, refetch: refetchCompanies } = useQuery({
    queryKey: ['companies', city?.id, activeCategory],
    queryFn: () => {
      const p = new URLSearchParams({ cityId: city!.id })
      if (activeCategory) p.set('category', activeCategory)
      return api.get<{ data: Company[] }>(`/api/companies?${p}`)
    },
    enabled: !!city,
    staleTime: 0,
  })

  // ── Produtos em destaque (mais recentes, para o grid)
  const { data: featuredData, refetch: refetchFeatured } = useQuery({
    queryKey: ['products-featured', city?.id, activeCategory],
    queryFn: () => {
      const p = new URLSearchParams({ cityId: city!.id, limit: '20' })
      if (activeCategory) p.set('category', activeCategory)
      return api.get<{ data: any[] }>(`/api/products?${p}`)
    },
    enabled: !!city,
  })

  // ── Produtos populares (mais vendidos, para o carrossel)
  const { data: popularData, refetch: refetchPopular } = useQuery({
    queryKey: ['products-popular', city?.id, activeCategory],
    queryFn: () => {
      const p = new URLSearchParams({ cityId: city!.id, limit: '10', sort: 'popular' })
      if (activeCategory) p.set('category', activeCategory)
      return api.get<{ data: any[] }>(`/api/products?${p}`)
    },
    enabled: !!city,
  })

  const companies = (companiesData as unknown as { data: Company[] })?.data ?? []
  const allCompanies = (allCompaniesData as unknown as { data: Company[] })?.data ?? []
  const featuredProducts: any[] = (featuredData as unknown as { data: any[] })?.data ?? []
  const popularProducts: any[] = (popularData as unknown as { data: any[] })?.data ?? []

  // Categorias únicas — sempre baseadas em TODAS as lojas, independente do filtro ativo
  const categories = useMemo(() => {
    const all = allCompanies.map(c => c.category).filter(Boolean) as string[]
    return [...new Set(all)].sort()
  }, [allCompanies])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchCompanies(),
        refetchAllCompanies(),
        refetchFeatured(),
        refetchPopular(),
        refetchPromo(),
        queryClient.invalidateQueries({ queryKey: ['banners-hero'] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refetchCompanies, refetchAllCompanies, refetchFeatured, refetchPopular, refetchPromo, queryClient])

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} colors={[ORANGE]} />
        }
      >

        {/* ── HERO IMAGE ── */}
        <View style={s.hero}>
          <Image
            source={HeroImage}
            style={s.heroImg}
            contentFit="cover"
            contentPosition="bottom"
          />



          {/* Header overlay — sino e carrinho */}
          <View style={[s.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={s.headerIconBtn} onPress={() => router.push('/(tabs)/cidade')} activeOpacity={0.75}>
              <Bell size={22} color="#070707" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerIconBtn} onPress={() => router.push('/(tabs)/carrinho')} activeOpacity={0.75}>
              <ShoppingBag size={22} color="#070707" strokeWidth={2} />
              {cartCount > 0 && (
                <View style={s.cartBadge}>
                  <Text style={s.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Título sobreposto na imagem */}
          <View style={s.heroContent}>
            <View style={s.counter}>
              <Text style={[s.counterTop, { color: '#242424ff' }]}>{Math.min(companies.length, 99).toString().padStart(2, '0')}</Text>
              <View style={[s.counterBar, { backgroundColor: '#242424ff' }]} />
              <Text style={[s.counterBot, { color: '#242424ff' }]}>{Math.min(categories.length, 99).toString().padStart(2, '0')}</Text>
            </View>
            <View style={s.titleContent}>
              <Text style={[s.titleText, { color: '#242424ff' }]}>
                O que você{"\n"}
                <Text style={s.titleOrange}> precisa, </Text>
                <Text style={{ color: '#242424ff', fontWeight: '800', }}>na palma{"\n"} da sua mão</Text>
              </Text>
              <Text style={[s.titleSub, { color: 'rgba(0,0,0,0.8)' }]}>
                {city
                  ? `Os melhores serviços e ofertas de ${city.name} na palma da sua mão.`
                  : 'Os melhores serviços e ofertas da sua cidade na palma da sua mão.'}
              </Text>
            </View>
          </View>
        </View>



        {/* ── CATEGORIAS (emoji, selecionado maior + fundo amarelo) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catRow}
          style={{ paddingTop: 15 }}
        >
          {/* Todas */}
          <TouchableOpacity
            style={s.catItem}
            onPress={() => setActiveCategory(null)}
            activeOpacity={0.8}
          >
            <View style={[s.catCircle, !activeCategory && s.catCircleSelected]}>
              <Image source={CategoryImages.todas} style={[s.catImg, !activeCategory && s.catImgSelected]} contentFit="contain" />
            </View>
            <Text style={[s.catLabel, !activeCategory && s.catLabelActive]}>Todas</Text>
          </TouchableOpacity>

          {categories.map(cat => {
            const meta = CAT_META[cat]
            const isActive = activeCategory === cat
            return (
              <TouchableOpacity
                key={cat}
                style={s.catItem}
                onPress={() => setActiveCategory(isActive ? null : cat)}
                activeOpacity={0.8}
              >
                <View style={[s.catCircle, isActive && s.catCircleSelected]}>
                  <Image
                    source={meta?.imageKey ? CategoryImages[meta.imageKey] : CategoryImages.todas}
                    style={[s.catImg, isActive && s.catImgSelected]}
                    contentFit="contain"
                  />
                </View>
                <Text style={[s.catLabel, isActive && s.catLabelActive]}>
                  {(meta?.label ?? cat).length > 8
                    ? (meta?.label ?? cat).slice(0, 7) + '…'
                    : (meta?.label ?? cat)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* ── CARROSSEL DE BANNERS PROMOCIONAIS (gerenciado pela prefeitura) ── */}
        {promoBanners.length > 0 && (
          <View style={s.promoSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.promoRow}
              decelerationRate="fast"
              snapToInterval={SW * 0.82 + 12}
              snapToAlignment="start"
            >
              {promoBanners.map((banner, idx) => (
                <TouchableOpacity
                  key={banner.id}
                  style={[s.promoBanner, { marginLeft: idx === 0 ? 20 : 12 }]}
                  activeOpacity={banner.link ? 0.88 : 1}
                  onPress={() => banner.link && Linking.openURL(banner.link)}
                >
                  <Image
                    source={{ uri: banner.imageUrl }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                  {/* Gradient overlay para legibilidade do texto */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={s.promoBannerGrad}
                  />
                  {(banner.title || banner.subtitle) && (
                    <View style={s.promoBannerInfo}>
                      {banner.title && (
                        <Text style={s.promoBannerTitle} numberOfLines={1}>{banner.title}</Text>
                      )}
                      {banner.subtitle && (
                        <Text style={s.promoBannerSub} numberOfLines={1}>{banner.subtitle}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ width: 20 }} />
            </ScrollView>
          </View>
        )}

        {/* ── PRODUTOS EM DESTAQUE (grid 2 colunas) ── */}
        {featuredProducts.length > 0 && (
          <View style={s.productsSection}>
            <View style={[s.sectionHeader, { paddingHorizontal: 20 }]}>
              <Text style={s.sectionTitle}>Produtos em Destaque</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>
                  {Math.min(featuredProducts.length, 20).toString().padStart(2, '0')}{' '}
                  <Text style={s.countBadgeSep}>itens</Text>
                </Text>
              </View>
            </View>
            <View style={s.featuredGrid}>
              {featuredProducts.slice(0, 20).map((item: any) => (
                <ProductGridCard key={item.id} product={item} width={FEATURED_W} />
              ))}
            </View>
          </View>
        )}

        {/* ── PRODUTOS POPULARES (carrossel horizontal, mais vendidos) ── */}
        {popularProducts.length > 0 && (
          <View style={s.productsSection}>
            <View style={[s.sectionHeader, { paddingHorizontal: 20 }]}>
              <Text style={s.sectionTitle}>Produtos Populares</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>
                  {popularProducts.length.toString().padStart(2, '0')}{' '}
                  <Text style={s.countBadgeSep}>itens</Text>
                </Text>
              </View>
            </View>

            <FlatList
              horizontal
              data={popularProducts}
              keyExtractor={item => item.id}
              renderItem={({ item }: { item: any }) => <ProductCard product={item} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingBottom: 8 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              ListFooterComponent={<View style={{ width: 20 }} />}
            />
          </View>
        )}

        {/* ── SEÇÃO LOJAS (5 primeiras + ver todas) ── */}
        {companies.length > 0 && (
          <View style={s.storeSection}>
            <View style={s.sectionHeader}>
              <View style={s.sectionLeft}>
                <Text style={s.sectionTitle}>Lojas e Empresas</Text>
                <View style={s.sectionSub}>
                  <MapPin size={10} color="#9ca3af" />
                  <Text style={s.sectionSubText}>{city?.name}</Text>
                </View>
              </View>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>
                  {allCompanies.length.toString().padStart(2, '0')}
                  <Text style={s.countBadgeSep}> lojas</Text>
                </Text>
              </View>
            </View>

            {companies.slice(0, 5).map(company => (
              <CompanyChip key={company.id} company={company} />
            ))}

            {allCompanies.length > 5 && (
              <TouchableOpacity
                style={s.verTodasBtn}
                onPress={() => router.push('/lojas')}
                activeOpacity={0.85}
              >
                <Text style={s.verTodasText}>Ver todas as lojas ({allCompanies.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Loading */}
        {companiesLoading && !refreshing && (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={ORANGE} />
          </View>
        )}

        {/* Espaço final */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ── Estilos principais ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1, backgroundColor: '#fff' },

  // ── Hero
  hero: {
    width: '100%',
    aspectRatio: 3 / 4,   // ← altura proporcional à largura (ajuste o ratio ao gosto)
    // ou use minHeight: 480 se preferir altura fixa maior
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,

  },
  heroContent: {
    position: 'absolute',

    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji: { fontSize: 100 },
  heroFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
  },

  // ── Header overlay
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
  },
  cityBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconBtn: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cartBtn: { backgroundColor: ORANGE },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  cartBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // ── Counter + título (exatamente como no print)
  titleBlock: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24,
    gap: 16, backgroundColor: '#fff',
  },
  counter: { alignItems: 'center', gap: 6, paddingTop: 6, width: 28 },
  counterTop: {
    fontSize: 20, fontWeight: '900', color: '#111827', lineHeight: 22,
  },
  counterBar: {
    width: 1.5, height: 40, backgroundColor: '#d1d5db', borderRadius: 2,
  },
  counterBot: {
    fontSize: 14, fontWeight: '700', color: '#9ca3af',
  },
  titleContent: { flex: 1, gap: 8 },
  titleText: {
    fontSize: 33, color: '#111827',
    fontWeight: '800',
    lineHeight: 39, letterSpacing: -0.5,
  },
  titleOrange: { color: ORANGE, fontWeight: '800', },
  titleSub: {
    fontSize: 13, color: '#9ca3af', lineHeight: 19,
  },

  // ── Categorias
  catRow: {
    paddingHorizontal: 20, paddingBottom: 20, gap: 14,
    alignItems: 'flex-end',
  },
  catItem: { alignItems: 'center', gap: 6, width: 62 },
  catCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  catCircleSelected: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#f5c518',
    shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catImg: { width: 30, height: 30 },
  catImgSelected: { width: 38, height: 38 },
  catEmoji: { fontSize: 22 },
  catEmojiSelected: { fontSize: 28 },
  catLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', textAlign: 'center' },
  catLabelActive: { color: '#111827', fontWeight: '800' },

  // ── Banners promocionais
  promoSection: { marginBottom: 8 },
  promoRow: { paddingBottom: 8 },
  promoBanner: {
    width: SW * 0.82, height: 120,
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  promoBannerGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },
  promoBannerInfo: {
    position: 'absolute', bottom: 12, left: 14, right: 14,
  },
  promoBannerTitle: {
    fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.2,
  },
  promoBannerSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 2,
  },

  // ── Section header (exatamente como no print: título à esq, badge à dir)
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionLeft: { gap: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: -0.3 },
  sectionSub: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionSubText: { fontSize: 11, color: '#9ca3af' },
  countBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  countBadgeSep: { color: '#d1d5db' },

  // ── Stores section
  storeSection: {
    paddingHorizontal: 20, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: '#f5f5f5',
    paddingTop: 20,
  },

  // ── Products grid section
  gridSection: {
    paddingTop: 20, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },

  // ── Products carousel section
  productsSection: {
    paddingTop: 20,
    borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },

  // Ver todas lojas
  verTodasBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  verTodasText: {
    fontSize: 14, fontWeight: '700', color: '#111827',
  },

  // Loading
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
})

// ── Product grid card styles (carrossel horizontal) ──────────────────────────

const pg = StyleSheet.create({
  card: {
    width: PG_W,
    borderRadius: 18,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Imagem quadrada 1:1
  imgWrap: {
    width: PG_W, height: PG_IMG,
    backgroundColor: '#f8f8f8',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  imgFallback: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  // Badge "X% Off" (canto superior esquerdo)
  discountBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: GREEN, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  discountText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  // Botão de favorito (canto superior direito)
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Área de texto abaixo da imagem
  info: {
    paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, gap: 3,
  },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17 },
  storeName: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  // Linha de preço + botão carrinho
  bottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 6,
  },
  price: { fontSize: 15, fontWeight: '900', color: '#111827' },
  cartBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
})

// ── Company chip styles ───────────────────────────────────────────────────────

const chip = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cat: { fontSize: 12, color: '#9ca3af' },
  delivBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ORANGE_LIGHT, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  delivText: { fontSize: 11, color: ORANGE, fontWeight: '600' },
})
