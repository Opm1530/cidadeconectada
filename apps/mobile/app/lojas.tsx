import {
  View, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, FlatList,
} from 'react-native'
import { Text } from '@/components/Text'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Bike, Search } from 'lucide-react-native'
import { CategoryImages } from '@/lib/images'
import type { CategoryImageKey } from '@/lib/images'
import { useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { useCityStore } from '@/store/city'
import type { Company } from '@cc/shared'

const ORANGE = '#f97316'
const ORANGE_LIGHT = '#fff7ed'

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
  Hortifruti: ['#86efac', '#22c55e'],
  Papelaria: ['#fda4af', '#f43f5e'],
  Brinquedos: ['#fdba74', '#f97316'],
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

function CompanyRow({ company }: { company: any }) {
  const router = useRouter()
  const meta = company.category ? CAT_META[company.category] : null
  const colors = getColors(company.category)

  return (
    <TouchableOpacity
      style={s.row}
      onPress={() => router.push(`/empresa/${company.slug}`)}
      activeOpacity={0.88}
    >
      <View style={s.rowIcon}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        {company.logoUrl ? (
          <Image source={{ uri: company.logoUrl }} style={s.rowLogo} contentFit="cover" />
        ) : (
          <Image
            source={meta?.imageKey ? CategoryImages[meta.imageKey] : CategoryImages.todas}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
          />
        )}
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowName} numberOfLines={1}>{company.name}</Text>
        <Text style={s.rowCat} numberOfLines={1}>{meta?.label ?? company.category ?? 'Loja'}</Text>
      </View>
      {(company.hasOwnDelivery || company.acceptsPlatformDrivers) && (
        <View style={s.delivBadge}>
          <Bike size={10} color={ORANGE} />
          <Text style={s.delivText}>Entrega</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function LojasScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { city } = useCityStore()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: allData, isLoading } = useQuery({
    queryKey: ['companies-all', city?.id],
    queryFn: () => api.get<{ data: Company[] }>(`/api/companies?cityId=${city!.id}`),
    enabled: !!city,
    staleTime: 0,
  })

  const { data: filteredData, isLoading: filtering } = useQuery({
    queryKey: ['companies', city?.id, activeCategory],
    queryFn: () => {
      const p = new URLSearchParams({ cityId: city!.id })
      if (activeCategory) p.set('category', activeCategory)
      return api.get<{ data: Company[] }>(`/api/companies?${p}`)
    },
    enabled: !!city,
    staleTime: 0,
  })

  const allCompanies = (allData as unknown as { data: Company[] })?.data ?? []
  const companies = (filteredData as unknown as { data: Company[] })?.data ?? []

  const categories = useMemo(() => {
    const all = allCompanies.map(c => c.category).filter(Boolean) as string[]
    return [...new Set(all)].sort()
  }, [allCompanies])

  const filtered = useMemo(() => {
    if (!search.trim()) return companies
    const q = search.toLowerCase()
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.category ?? '').toLowerCase().includes(q)
    )
  }, [companies, search])

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Lojas e Empresas</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <Search size={16} color="#9ca3af" />
        <Text
          style={s.searchInput}
          onPress={() => {}}
        >
          {search || 'Buscar loja...'}
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catRow}
        style={s.catScroll}
      >
        <TouchableOpacity
          style={[s.catChip, !activeCategory && s.catChipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[s.catChipText, !activeCategory && s.catChipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {categories.map(cat => {
          const isActive = activeCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              style={[s.catChip, isActive && s.catChipActive]}
              onPress={() => setActiveCategory(isActive ? null : cat)}
            >
              <Image
                source={CategoryImages[CAT_META[cat]?.imageKey ?? 'todas']}
                style={{ width: 18, height: 18 }}
                contentFit="contain"
              />
              <Text style={[s.catChipText, isActive && s.catChipTextActive]}>
                {CAT_META[cat]?.label ?? cat}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* List */}
      {(isLoading || filtering) ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <CompanyRow company={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={s.empty}>Nenhuma loja encontrada</Text>
          }
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  countBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#f3f4f6', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#9ca3af' },

  catScroll: { maxHeight: 56 },
  catRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f3f4f6',
  },
  catChipActive: { backgroundColor: '#f5c518' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  catChipTextActive: { color: '#111827', fontWeight: '800' },

  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  rowIcon: {
    width: 52, height: 52, borderRadius: 16,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  rowLogo: { width: '100%', height: '100%' },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowCat: { fontSize: 12, color: '#9ca3af' },
  delivBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ORANGE_LIGHT, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  delivText: { fontSize: 11, color: ORANGE, fontWeight: '600' },

  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
})
