import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Search, X, Bike } from 'lucide-react-native'
import { useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { useCityStore } from '@/store/city'
import { formatCurrency } from '@cc/shared'
import { CategoryImages } from '@/lib/images'
import type { CategoryImageKey } from '@/lib/images'
import type { Company } from '@cc/shared'

const ORANGE       = '#f97316'
const ORANGE_LIGHT = '#fff7ed'

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

// ── Card de loja nos resultados ───────────────────────────────────────────────

function CompanyResult({ company }: { company: any }) {
  const router = useRouter()
  const meta   = company.category ? CAT_META[company.category] : null
  const colors = getColors(company.category)

  return (
    <TouchableOpacity
      style={r.companyCard}
      onPress={() => router.push(`/empresa/${company.slug}`)}
      activeOpacity={0.88}
    >
      <View style={r.companyIcon}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} />
        {company.logoUrl ? (
          <Image source={{ uri: company.logoUrl }} style={r.companyLogo} contentFit="cover" />
        ) : (
          <Image
            source={CategoryImages[meta?.imageKey ?? 'todas']}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
          />
        )}
      </View>

      <View style={r.companyInfo}>
        <Text style={r.companyName} numberOfLines={1}>{company.name}</Text>
        <Text style={r.companyCat}>{meta?.label ?? company.category ?? 'Loja'}</Text>
        {(company.hasOwnDelivery || company.acceptsPlatformDrivers) && (
          <View style={r.delivRow}>
            <Bike size={10} color={ORANGE} />
            <Text style={r.delivText}>Entrega disponível</Text>
          </View>
        )}
      </View>

      <View style={r.arrow}>
        <Text style={r.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Card de produto nos resultados ────────────────────────────────────────────

function ProductResult({ product }: { product: any }) {
  const router = useRouter()
  const colors = getColors(product.company?.category)

  return (
    <TouchableOpacity
      style={r.productCard}
      onPress={() => router.push(`/empresa/${product.company?.slug}`)}
      activeOpacity={0.88}
    >
      <View style={r.productImg}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} />
        {product.imageUrl && (
          <Image source={{ uri: product.imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        )}
      </View>

      <View style={r.productInfo}>
        <Text style={r.productName} numberOfLines={1}>{product.name}</Text>
        <Text style={r.productStore} numberOfLines={1}>{product.company?.name}</Text>
        <Text style={r.productPrice}>{formatCurrency(Number(product.price))}</Text>
      </View>

      <TouchableOpacity
        style={r.productBtn}
        onPress={() => router.push(`/empresa/${product.company?.slug}`)}
        activeOpacity={0.85}
      >
        <Text style={r.productBtnText}>Ver</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

// ── Tela principal ────────────────────────────────────────────────────────────

const categoryKeys = Object.keys(CAT_META)

export default function PesquisarScreen() {
  const { city }           = useCityStore()
  const [q, setQ]          = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const query              = q.trim()

  // Categoria OU texto ativam a busca
  const hasFilter = query.length >= 2 || !!activeCategory

  const { data: companiesData, isLoading: loadingC } = useQuery({
    queryKey: ['search-companies', city?.id, query, activeCategory],
    queryFn:  () => {
      const p = new URLSearchParams({ cityId: city!.id })
      if (query.length >= 2) p.set('search', query)
      if (activeCategory)    p.set('category', activeCategory)
      return api.get<{ data: Company[] }>(`/api/companies?${p}`)
    },
    enabled: !!city && hasFilter,
  })

  const { data: productsData, isLoading: loadingP } = useQuery({
    queryKey: ['search-products', city?.id, query, activeCategory],
    queryFn:  () => {
      const p = new URLSearchParams({ cityId: city!.id, limit: '20' })
      if (query.length >= 2) p.set('search', encodeURIComponent(query))
      if (activeCategory)    p.set('category', activeCategory)
      return api.get<{ data: any[] }>(`/api/products?${p}`)
    },
    enabled: !!city && hasFilter,
  })

  const companies  = (companiesData as unknown as { data: Company[] })?.data ?? []
  const products   = (productsData  as unknown as { data: any[]    })?.data ?? []
  const isLoading  = loadingC || loadingP
  const hasResults = companies.length > 0 || products.length > 0

  type ResultItem =
    | { type: 'section'; label: string; count: number }
    | { type: 'company'; data: any }
    | { type: 'product'; data: any }

  const listData = useMemo<ResultItem[]>(() => {
    if (!hasFilter) return []
    const items: ResultItem[] = []
    if (companies.length > 0) {
      items.push({ type: 'section', label: 'Lojas', count: companies.length })
      companies.forEach(c => items.push({ type: 'company', data: c }))
    }
    if (products.length > 0) {
      items.push({ type: 'section', label: 'Produtos', count: products.length })
      products.forEach(p => items.push({ type: 'product', data: p }))
    }
    return items
  }, [companies, products, hasFilter])

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Pesquisar</Text>
        <Text style={s.headerSub}>
          {city ? `Buscando em ${city.name}` : 'Selecione uma cidade'}
        </Text>
      </View>

      {/* ── Barra de busca ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Search size={18} color="#9ca3af" strokeWidth={1.5} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar lojas, pratos, produtos..."
            placeholderTextColor="#9ca3af"
            value={q}
            onChangeText={(text) => {
              setQ(text)
              if (text.length > 0) setActiveCategory(null)
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')}>
              <X size={16} color="#9ca3af" strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Carrossel de categorias (sempre visível) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catRow}
        style={s.catScroll}
      >
        {categoryKeys.map(cat => {
          const meta    = CAT_META[cat]
          const isActive = activeCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              style={s.catItem}
              onPress={() => {
                setActiveCategory(isActive ? null : cat)
                setQ('')
              }}
              activeOpacity={0.8}
            >
              <View style={[s.catCircle, isActive && s.catCircleActive]}>
                <Image
                  source={CategoryImages[meta.imageKey]}
                  style={[s.catImg, isActive && s.catImgActive]}
                  contentFit="contain"
                />
              </View>
              <Text style={[s.catLabel, isActive && s.catLabelActive]} numberOfLines={1}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* ── Conteúdo de busca ── */}
      {!hasFilter ? null : isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={ORANGE} size="large" />
          <Text style={s.loadingText}>Buscando...</Text>
        </View>
      ) : !hasResults ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>Nenhum resultado</Text>
          <Text style={s.emptySub}>Tente buscar por outro nome ou categoria.</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.type === 'section' ? `sec-${i}` :
            item.type === 'company' ? `co-${item.data.id}` : `pr-${item.data.id}`
          }
          contentContainerStyle={s.resultsList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <View style={s.sectionRow}>
                  <Text style={s.sectionLabel}>{item.label}</Text>
                  <View style={s.sectionBadge}>
                    <Text style={s.sectionBadgeText}>{item.count}</Text>
                  </View>
                </View>
              )
            }
            if (item.type === 'company') return <CompanyResult company={item.data} />
            return <ProductResult product={item.data} />
          }}
        />
      )}
    </SafeAreaView>
  )
}

// ── Estilos principais ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  searchWrap: { paddingHorizontal: 20, paddingVertical: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f5f5f5', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },

  // ── Carrossel de categorias
  catScroll: { flexGrow: 0 },
  catRow: { paddingHorizontal: 20, paddingBottom: 20, gap: 14, alignItems: 'flex-start' },
  catItem: { alignItems: 'center', gap: 7, width: 72 },
  catCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  catCircleActive: {
    backgroundColor: '#f5c518',
    width: 68, height: 68, borderRadius: 34,
    shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catImg: { width: 42, height: 42 },
  catImgActive: { width: 50, height: 50 },
  catLabel: {
    fontSize: 11, color: '#374151', fontWeight: '600',
    textAlign: 'center',
  },
  catLabelActive: { color: '#111827', fontWeight: '800' },

  // Estados
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#9ca3af' },
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: '#111827' },
  emptySub:    { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  // Resultados
  resultsList: { paddingBottom: 40 },
  sectionRow:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionBadge: {
    backgroundColor: ORANGE, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
})

// ── Result card styles ────────────────────────────────────────────────────────

const r = StyleSheet.create({
  companyCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  companyIcon: {
    width: 54, height: 54, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  companyLogo: { width: '100%', height: '100%' },
  companyInfo: { flex: 1, gap: 2 },
  companyName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  companyCat:  { fontSize: 12, color: '#9ca3af' },
  delivRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  delivText:   { fontSize: 11, color: ORANGE, fontWeight: '600' },
  arrow:       { paddingLeft: 4 },
  arrowText:   { fontSize: 22, color: '#d1d5db', fontWeight: '300' },

  productCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  productImg: {
    width: 64, height: 64, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  productInfo:  { flex: 1, gap: 2 },
  productName:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  productStore: { fontSize: 12, color: '#9ca3af' },
  productPrice: { fontSize: 14, fontWeight: '800', color: ORANGE, marginTop: 2 },
  productBtn: {
    backgroundColor: '#1c1c1e', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  productBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
})
