import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, ScrollView, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Clock, Bike, Plus, ArrowLeft, Store, X, Minus, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@cc/shared'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ProductOption { id: string; name: string; priceAdd: number }
interface OptionGroup {
  id: string; name: string; type: 'SINGLE' | 'MULTIPLE'
  required: boolean; minSelect: number; maxSelect: number
  options: ProductOption[]
}
interface Product {
  id: string; name: string; description?: string | null
  price: number | string; imageUrl?: string | null; category?: string | null
  optionGroups?: OptionGroup[]
}
interface CompanyDetail {
  id: string; name: string; description: string | null; category: string | null
  logoUrl: string | null; coverUrl: string | null
  hasOwnDelivery: boolean; ownDeliveryFee: number | null
  acceptsPlatformDrivers: boolean; acceptsPix: boolean; acceptsCashOnDelivery: boolean
  products: Product[]
}

// ── Cores por categoria ───────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, [string, string]> = {
  'Restaurante': ['#fb923c', '#ef4444'], 'Lanchonete': ['#fbbf24', '#f97316'],
  'Pizzaria': ['#f87171', '#e11d48'],   'Mercado': ['#4ade80', '#0d9488'],
  'Farmácia': ['#60a5fa', '#06b6d4'],   'Padaria': ['#fcd34d', '#f59e0b'],
  'Açaí': ['#a855f7', '#ec4899'],       'Sushi': ['#2dd4bf', '#3b82f6'],
  'Bebidas': ['#38bdf8', '#3b82f6'],    'Doceria': ['#f472b6', '#fb7185'],
  'Petshop': ['#a3e635', '#10b981'],    'Serviços': ['#94a3b8', '#64748b'],
  'Moda': ['#e879f9', '#f43f5e'],       'Eletrônicos': ['#818cf8', '#a855f7'],
  'Hortifruti': ['#86efac', '#22c55e'],
}
function getColors(cat?: string | null): [string, string] {
  return (cat && CATEGORY_COLORS[cat]) ? CATEGORY_COLORS[cat] : ['#62a84a', '#4a7e38']
}

// ── Modal de opções ───────────────────────────────────────────────────────────
interface ProductModalProps {
  product: Product | null
  companyColors: [string, string]
  onClose: () => void
  onAdd: (product: Product, selectedOptions: ProductOption[], qty: number) => void
}

function ProductModal({ product, companyColors, onClose, onAdd }: ProductModalProps) {
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})

  if (!product) return null

  const groups = product.optionGroups ?? []

  function toggleOption(group: OptionGroup, option: ProductOption) {
    setSelected(prev => {
      const current = new Set(prev[group.id] ?? [])
      if (group.type === 'SINGLE') {
        return { ...prev, [group.id]: new Set([option.id]) }
      }
      if (current.has(option.id)) {
        current.delete(option.id)
      } else if (current.size < group.maxSelect) {
        current.add(option.id)
      }
      return { ...prev, [group.id]: current }
    })
  }

  function isValid() {
    return groups.every(g => {
      if (!g.required) return true
      const count = selected[g.id]?.size ?? 0
      return count >= (g.minSelect || 1)
    })
  }

  const selectedOptions: ProductOption[] = []
  groups.forEach(g => {
    g.options.forEach(o => {
      if (selected[g.id]?.has(o.id)) selectedOptions.push(o)
    })
  })

  const optionsTotal = selectedOptions.reduce((s, o) => s + Number(o.priceAdd), 0)
  const unitTotal = Number(product.price) + optionsTotal
  const total = unitTotal * qty

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          {/* Header */}
          <View style={modal.header}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={modal.productImg} contentFit="cover" />
            ) : (
              <LinearGradient colors={companyColors} style={modal.productImg}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 28 }}>{product.name?.[0]}</Text>
              </LinearGradient>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} />
            <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
              <X size={18} color="#fff" />
            </TouchableOpacity>
            <View style={modal.headerInfo}>
              <Text style={modal.productName}>{product.name}</Text>
              <Text style={modal.productBasePrice}>{formatCurrency(Number(product.price))}</Text>
            </View>
          </View>

          <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
            {product.description && (
              <Text style={modal.desc}>{product.description}</Text>
            )}

            {/* Grupos de opções */}
            {groups.map(group => (
              <View key={group.id} style={modal.group}>
                <View style={modal.groupHeader}>
                  <Text style={modal.groupName}>{group.name}</Text>
                  <Text style={modal.groupMeta}>
                    {group.type === 'SINGLE' ? 'Escolha 1' : `Até ${group.maxSelect}`}
                    {group.required ? ' · Obrigatório' : ''}
                  </Text>
                </View>
                {group.options.map(option => {
                  const isSelected = selected[group.id]?.has(option.id) ?? false
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[modal.optionRow, isSelected && modal.optionRowSelected]}
                      onPress={() => toggleOption(group, option)}
                      activeOpacity={0.7}
                    >
                      <View style={[modal.optionCheck, isSelected && modal.optionCheckSelected]}>
                        {isSelected && <Check size={12} color="#fff" />}
                      </View>
                      <Text style={[modal.optionName, isSelected && modal.optionNameSelected]}>{option.name}</Text>
                      {Number(option.priceAdd) > 0 && (
                        <Text style={modal.optionPrice}>+{formatCurrency(Number(option.priceAdd))}</Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer: qtd + adicionar */}
          <View style={modal.footer}>
            <View style={modal.qtyRow}>
              <TouchableOpacity style={modal.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Minus size={16} color="#374151" />
              </TouchableOpacity>
              <Text style={modal.qtyText}>{qty}</Text>
              <TouchableOpacity style={modal.qtyBtn} onPress={() => setQty(q => q + 1)}>
                <Plus size={16} color="#374151" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[modal.addBtn, !isValid() && modal.addBtnDisabled]}
              onPress={() => isValid() && onAdd(product, selectedOptions, qty)}
              disabled={!isValid()}
            >
              <Text style={modal.addBtnText}>Adicionar · {formatCurrency(total)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Tela empresa ──────────────────────────────────────────────────────────────
export default function EmpresaScreen() {
  const { slug, productId } = useLocalSearchParams<{ slug: string; productId?: string }>()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { addItem, items, companyId, subtotal } = useCartStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => api.get<CompanyDetail>(`/api/companies/${slug}`),
    enabled: !!slug,
  })

  // Abre modal do produto automaticamente quando vindo de um card da home
  useEffect(() => {
    if (!company || !productId) return
    const c = company as unknown as CompanyDetail
    const found = c.products?.find(p => p.id === productId)
    if (found) setSelectedProduct(found)
  }, [company, productId])

  if (isLoading) {
    return <View style={styles.loadingWrap}><ActivityIndicator color="#62a84a" size="large" /></View>
  }

  const c = company as unknown as CompanyDetail
  if (!c) return <View style={styles.loadingWrap}><Store size={40} color="#d1d5db" /><Text style={styles.notFound}>Loja não encontrada</Text></View>

  const colors = getColors(c.category)
  const hasDelivery = c.hasOwnDelivery || c.acceptsPlatformDrivers

  const groups: Record<string, Product[]> = {}
  ;(c.products ?? []).forEach((p: Product) => {
    const cat = p.category ?? 'Cardápio'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(p)
  })

  function handleProductPress(product: Product) {
    const hasOptions = (product.optionGroups ?? []).length > 0
    if (hasOptions) {
      setSelectedProduct(product)
    } else {
      addItemToCart(product, [], 1)
    }
  }

  function addItemToCart(product: Product, options: ProductOption[], qty: number) {
    const optionsTotal = options.reduce((s, o) => s + Number(o.priceAdd), 0)
    addItem(
      {
        id: product.id,
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.price) + optionsTotal,
        quantity: qty,
        options: options.map(o => ({ id: o.id, name: o.name, priceAdd: Number(o.priceAdd) })),
      },
      c.id, c.name, slug!,
    )
    setSelectedProduct(null)
  }

  const cartItemCount = companyId === c.id ? items.reduce((s, i) => s + i.quantity, 0) : 0
  const cartSubtotal = companyId === c.id ? subtotal() : 0

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Esconde o header nativo (remove o "< Voltar" duplicado) */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Capa */}
        <View style={styles.coverWrap}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          {c.coverUrl && <Image source={{ uri: c.coverUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />}
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.coverInfo}>
            <View style={styles.coverLogoWrap}>
              {c.logoUrl ? <Image source={{ uri: c.logoUrl }} style={styles.coverLogo} contentFit="cover" /> : (
                <LinearGradient colors={colors} style={styles.coverLogo}>
                  <Text style={styles.coverLogoInitial}>{c.name?.[0] ?? '?'}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverName}>{c.name}</Text>
              {c.category && <Text style={styles.coverCategory}>{c.category}</Text>}
            </View>
          </View>
        </View>

        {/* Info badges */}
        <View style={styles.infoBar}>
          <View style={styles.infoBadge}><Clock size={12} color="#6b7280" /><Text style={styles.infoBadgeText}>20–40 min</Text></View>
          {hasDelivery && (
            <View style={[styles.infoBadge, styles.infoBadgeGreen]}>
              <Bike size={12} color="#16a34a" />
              <Text style={[styles.infoBadgeText, { color: '#16a34a' }]}>
                {c.hasOwnDelivery && c.ownDeliveryFee ? `Entrega ${formatCurrency(c.ownDeliveryFee)}` : 'Entrega disponível'}
              </Text>
            </View>
          )}
          {c.acceptsPix && <View style={[styles.infoBadge, styles.infoBadgeBlue]}><Text style={[styles.infoBadgeText, { color: '#2563eb' }]}>Pix</Text></View>}
          {c.acceptsCashOnDelivery && <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>Dinheiro</Text></View>}
        </View>

        {c.description && <View style={styles.descWrap}><Text style={styles.descText}>{c.description}</Text></View>}

        {/* Produtos por categoria */}
        {Object.entries(groups).map(([cat, products]) => (
          <View key={cat}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{cat}</Text>
              <View style={styles.sectionLine} />
            </View>
            {products.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productRow} onPress={() => handleProductPress(product)} activeOpacity={0.7}>
                <View style={styles.productImgWrap}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImg} contentFit="cover" />
                  ) : (
                    <LinearGradient colors={colors} style={styles.productImg}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22 }}>{product.name?.[0] ?? '?'}</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.description && <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>}
                  <View style={styles.productBottom}>
                    <Text style={styles.productPrice}>{formatCurrency(Number(product.price))}</Text>
                    {(product.optionGroups ?? []).length > 0 && (
                      <Text style={styles.productHasOptions}>Personalizável</Text>
                    )}
                  </View>
                </View>
                <View style={styles.addBtn}><Plus size={16} color="#fff" /></View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {Object.keys(groups).length === 0 && (
          <View style={styles.emptyProducts}><Text style={styles.emptyProductsText}>Nenhum produto cadastrado ainda</Text></View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Cart flutuante */}
      {cartItemCount > 0 && (
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(tabs)/carrinho')}>
          <View style={styles.cartBtnBadge}><Text style={styles.cartBtnBadgeText}>{cartItemCount}</Text></View>
          <ShoppingBag size={18} color="#fff" />
          <Text style={styles.cartBtnText}>Ver carrinho</Text>
          <Text style={styles.cartBtnPrice}>{formatCurrency(cartSubtotal)}</Text>
        </TouchableOpacity>
      )}

      {/* Modal de opções */}
      <ProductModal
        product={selectedProduct}
        companyColors={colors}
        onClose={() => setSelectedProduct(null)}
        onAdd={addItemToCart}
      />
    </View>
  )
}

// ── Estilos principais ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  notFound: { fontSize: 15, color: '#9ca3af' },
  coverWrap: { width: '100%', height: 320, position: 'relative' },
  backBtn: { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  coverInfo: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  coverLogoWrap: { width: 56, height: 56, borderRadius: 14, borderWidth: 2.5, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#fff' },
  coverLogo: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  coverLogoInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  coverName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  coverCategory: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  infoBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f9fafb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  infoBadgeGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  infoBadgeBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  infoBadgeText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  descWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  descText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.2 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#f3f4f6' },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  productImgWrap: { width: 76, height: 76, borderRadius: 14, overflow: 'hidden', flexShrink: 0 },
  productImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  productDesc: { fontSize: 12, color: '#9ca3af', lineHeight: 17 },
  productBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#62a84a' },
  productHasOptions: { fontSize: 10, color: '#9ca3af', fontWeight: '600', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  addBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#62a84a', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyProducts: { alignItems: 'center', padding: 40 },
  emptyProductsText: { fontSize: 14, color: '#9ca3af' },
  cartBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#62a84a', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 8, ...Platform.select({ ios: { shadowColor: '#62a84a', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 8 } }) },
  cartBtnBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cartBtnBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  cartBtnText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15 },
  cartBtnPrice: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 15 },
})

// ── Estilos do modal ──────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { width: '100%', height: 200, position: 'relative', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  productImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  headerInfo: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  productName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  productBasePrice: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '600' },
  body: { maxHeight: 380 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 16, paddingVertical: 12, lineHeight: 20 },
  group: { paddingHorizontal: 16, paddingBottom: 8 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  groupName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  groupMeta: { fontSize: 12, color: '#9ca3af' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  optionRowSelected: { backgroundColor: '#f0fdf4', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 10 },
  optionCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  optionCheckSelected: { backgroundColor: '#62a84a', borderColor: '#62a84a' },
  optionName: { flex: 1, fontSize: 14, color: '#374151' },
  optionNameSelected: { color: '#62a84a', fontWeight: '600' },
  optionPrice: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  qtyBtn: { padding: 2 },
  qtyText: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 20, textAlign: 'center' },
  addBtn: { flex: 1, backgroundColor: '#62a84a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
