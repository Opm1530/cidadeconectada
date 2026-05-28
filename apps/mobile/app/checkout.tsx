import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Package, Bike, Store, CreditCard, Radio, User, Tag, X, CheckCircle, Smartphone } from 'lucide-react-native'
import { useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { api } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { useCityStore } from '@/store/city'
import { formatCurrency } from '@cc/shared'

interface AppliedCoupon {
  id: string
  code: string
  type: 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'FREE_SHIPPING'
  value: number | null
  valid: true
}

interface CompanyCheckout {
  id: string
  name: string
  hasOwnDelivery: boolean
  ownDeliveryFee: number | null
  acceptsPlatformDrivers: boolean
  acceptsPix: boolean
  acceptsMercadoPago: boolean
  acceptsCashOnDelivery: boolean
}

interface AvailableDriver {
  id: string
  deliveryFee: number
  vehicle: string | null
  user: { name: string }
}

type DeliveryType = 'PICKUP' | 'OWN_DELIVERY' | 'PLATFORM_DRIVER'
type PaymentMethod = 'PIX' | 'MERCADO_PAGO' | 'CASH_ON_DELIVERY'

const GREEN = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

export default function CheckoutScreen() {
  const router = useRouter()
  const { items, companyId, companyName, companySlug, subtotal, clear } = useCartStore()
  const { city } = useCityStore()
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('PICKUP')
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company-checkout', companySlug],
    queryFn: () => api.get<CompanyCheckout>(`/api/companies/${companySlug}`),
    enabled: !!companySlug,
  })

  const { data: driversData, isLoading: driversLoading } = useQuery({
    queryKey: ['available-drivers', city?.slug],
    queryFn: () => api.get<AvailableDriver[]>(`/api/cities/${city!.slug}/drivers`),
    enabled: !!city?.slug && deliveryType === 'PLATFORM_DRIVER',
    refetchInterval: 30_000, // refresh every 30s
  })

  if (!companyId || items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Package size={40} color="#d1d5db" />
          <Text style={styles.emptyText}>Carrinho vazio</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (companyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  const c = company as unknown as CompanyCheckout | undefined
  const drivers = (driversData as unknown as AvailableDriver[]) ?? []
  const selectedDriver = drivers.find(d => d.id === selectedDriverId) ?? null

  const isDelivery = deliveryType !== 'PICKUP'
  const ownDeliveryFee = deliveryType === 'OWN_DELIVERY' && c?.ownDeliveryFee ? Number(c.ownDeliveryFee) : 0
  const platformDriverFee = selectedDriver ? Number(selectedDriver.deliveryFee) : 0
  const rawDeliveryFee = deliveryType === 'OWN_DELIVERY' ? ownDeliveryFee : deliveryType === 'PLATFORM_DRIVER' ? platformDriverFee : 0
  const sub = subtotal()

  // Calculate discount
  let discountAmount = 0
  let subtotalDiscount = 0 // só sai do subtotal (FREE_SHIPPING não toca no subtotal)
  let deliveryFee = rawDeliveryFee
  if (appliedCoupon) {
    if (appliedCoupon.type === 'FREE_SHIPPING') {
      discountAmount = rawDeliveryFee
      deliveryFee = 0
      // subtotalDiscount permanece 0
    } else if (appliedCoupon.type === 'DISCOUNT_PERCENT') {
      discountAmount = Math.min(sub * ((appliedCoupon.value ?? 0) / 100), sub)
      subtotalDiscount = discountAmount
    } else if (appliedCoupon.type === 'DISCOUNT_FIXED') {
      discountAmount = Math.min(appliedCoupon.value ?? 0, sub)
      subtotalDiscount = discountAmount
    }
  }
  const total = sub - subtotalDiscount + deliveryFee

  function handleDeliveryTypeChange(type: DeliveryType) {
    setDeliveryType(type)
    setSelectedDriverId(null)
    // Reset free shipping coupon if switching away from OWN_DELIVERY
    if (appliedCoupon?.type === 'FREE_SHIPPING' && type !== 'OWN_DELIVERY') {
      setAppliedCoupon(null)
      setCouponError('Cupom de frete grátis removido (inválido para este tipo de entrega)')
    }
    // Entregador da plataforma exige Mercado Pago
    if (type === 'PLATFORM_DRIVER') {
      setPaymentMethod('MERCADO_PAGO')
    }
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    if (!companyId) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const params = new URLSearchParams({
        code,
        companyId,
        subtotal: String(sub),
        deliveryType,
      })
      const result = await api.get<AppliedCoupon>(`/api/coupons/validate?${params}`)
      setAppliedCoupon(result as unknown as AppliedCoupon)
      setCouponInput('')
    } catch (err: any) {
      setCouponError(err?.message ?? 'Cupom inválido')
      setAppliedCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCouponError(null)
    setCouponInput('')
  }

  async function handlePlaceOrder() {
    if (isDelivery && !address.trim()) {
      Alert.alert('Endereço obrigatório', 'Informe o endereço de entrega.')
      return
    }
    if (deliveryType === 'PLATFORM_DRIVER' && !selectedDriverId) {
      Alert.alert('Selecione um entregador', 'Escolha um dos entregadores disponíveis.')
      return
    }
    setLoading(true)
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
        selectedOptions: [],
      }))

      const result = await api.post<{ id: string }>('/api/orders', {
        companyId,
        deliveryType,
        deliveryAddress: isDelivery ? address.trim() : undefined,
        driverId: deliveryType === 'PLATFORM_DRIVER' ? selectedDriverId : undefined,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        notes: notes.trim() || undefined,
        items: orderItems,
      })

      const order = result as unknown as { id: string }
      clear()

      // Se pagamento via Mercado Pago, abre o checkout
      if (paymentMethod === 'MERCADO_PAGO') {
        try {
          const mpResult = await api.post<{ checkoutUrl: string }>('/api/payments/mp/create', {
            orderId: order.id,
            mode: 'checkout',
          })
          const mp = mpResult as unknown as { checkoutUrl: string }
          if (mp.checkoutUrl) {
            await WebBrowser.openBrowserAsync(mp.checkoutUrl)
          }
        } catch (mpErr) {
          // Mesmo se o MP falhar, o pedido foi criado — vai para a tela do pedido
          console.warn('MP checkout error:', mpErr)
        }
      }

      router.replace(`/pedido/${order.id}`)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível realizar o pedido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Empresa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pedido em</Text>
          <Text style={styles.companyName}>{companyName}</Text>
        </View>

        {/* Tipo de entrega */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de entrega</Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.option, deliveryType === 'PICKUP' && styles.optionSelected]}
              onPress={() => handleDeliveryTypeChange('PICKUP')}
            >
              <Store size={16} color={deliveryType === 'PICKUP' ? GREEN : '#6b7280'} />
              <Text style={[styles.optionText, deliveryType === 'PICKUP' && styles.optionTextSelected]}>
                Retirar na loja
              </Text>
            </TouchableOpacity>

            {c?.hasOwnDelivery && (
              <TouchableOpacity
                style={[styles.option, deliveryType === 'OWN_DELIVERY' && styles.optionSelected]}
                onPress={() => handleDeliveryTypeChange('OWN_DELIVERY')}
              >
                <Bike size={16} color={deliveryType === 'OWN_DELIVERY' ? GREEN : '#6b7280'} />
                <Text style={[styles.optionText, deliveryType === 'OWN_DELIVERY' && styles.optionTextSelected]}>
                  Entrega da loja
                  {c.ownDeliveryFee ? ` · ${formatCurrency(c.ownDeliveryFee)}` : ''}
                </Text>
              </TouchableOpacity>
            )}

            {c?.acceptsPlatformDrivers && (
              <TouchableOpacity
                style={[styles.option, deliveryType === 'PLATFORM_DRIVER' && styles.optionSelected]}
                onPress={() => handleDeliveryTypeChange('PLATFORM_DRIVER')}
              >
                <Bike size={16} color={deliveryType === 'PLATFORM_DRIVER' ? GREEN : '#6b7280'} />
                <Text style={[styles.optionText, deliveryType === 'PLATFORM_DRIVER' && styles.optionTextSelected]}>
                  Entregador da plataforma
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Entregadores disponíveis */}
        {deliveryType === 'PLATFORM_DRIVER' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entregadores disponíveis</Text>

            {driversLoading ? (
              <ActivityIndicator color={GREEN} />
            ) : drivers.length === 0 ? (
              <View style={styles.noDrivers}>
                <Radio size={22} color="#d1d5db" />
                <Text style={styles.noDriversTitle}>Nenhum entregador online</Text>
                <Text style={styles.noDriversDesc}>
                  No momento não há entregadores disponíveis. Tente novamente em alguns minutos.
                </Text>
              </View>
            ) : (
              <View style={styles.optionGroup}>
                {drivers.map(driver => (
                  <TouchableOpacity
                    key={driver.id}
                    style={[styles.driverOption, selectedDriverId === driver.id && styles.driverOptionSelected]}
                    onPress={() => setSelectedDriverId(driver.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.driverAvatarWrap}>
                      <User size={18} color={selectedDriverId === driver.id ? GREEN : '#6b7280'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverName, selectedDriverId === driver.id && styles.driverNameSelected]}>
                        {driver.user.name}
                      </Text>
                      {driver.vehicle && (
                        <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
                      )}
                    </View>
                    <View style={styles.driverFeeWrap}>
                      <Text style={[styles.driverFee, selectedDriverId === driver.id && styles.driverFeeSelected]}>
                        {formatCurrency(driver.deliveryFee)}
                      </Text>
                      <Text style={styles.driverFeeLabel}>entrega</Text>
                    </View>
                    <View style={[styles.radioOuter, selectedDriverId === driver.id && styles.radioOuterSelected]}>
                      {selectedDriverId === driver.id && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Endereço (só se delivery) */}
        {isDelivery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Endereço de entrega</Text>
            <TextInput
              style={styles.input}
              placeholder="Rua, número, bairro, cidade"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {/* Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forma de pagamento</Text>
          <View style={styles.optionGroup}>
            {/* Mercado Pago — obrigatório para PLATFORM_DRIVER; opcional para os demais */}
            {(c?.acceptsMercadoPago || deliveryType === 'PLATFORM_DRIVER') && (
              <TouchableOpacity
                style={[styles.option, paymentMethod === 'MERCADO_PAGO' && styles.optionSelected]}
                onPress={() => setPaymentMethod('MERCADO_PAGO')}
              >
                <Smartphone size={16} color={paymentMethod === 'MERCADO_PAGO' ? GREEN : '#6b7280'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, paymentMethod === 'MERCADO_PAGO' && styles.optionTextSelected]}>
                    Mercado Pago
                  </Text>
                  <Text style={styles.optionSub}>Pix, cartão, boleto</Text>
                </View>
                {deliveryType === 'PLATFORM_DRIVER' && (
                  <Text style={styles.requiredBadge}>obrigatório</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Pix estático da loja — não disponível para PLATFORM_DRIVER */}
            {c?.acceptsPix && deliveryType !== 'PLATFORM_DRIVER' && (
              <TouchableOpacity
                style={[styles.option, paymentMethod === 'PIX' && styles.optionSelected]}
                onPress={() => setPaymentMethod('PIX')}
              >
                <CreditCard size={16} color={paymentMethod === 'PIX' ? GREEN : '#6b7280'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, paymentMethod === 'PIX' && styles.optionTextSelected]}>
                    Pix
                  </Text>
                  <Text style={styles.optionSub}>Confirmação manual pelo lojista</Text>
                </View>
              </TouchableOpacity>
            )}

            {c?.acceptsCashOnDelivery && deliveryType !== 'PLATFORM_DRIVER' && (
              <TouchableOpacity
                style={[styles.option, paymentMethod === 'CASH_ON_DELIVERY' && styles.optionSelected]}
                onPress={() => setPaymentMethod('CASH_ON_DELIVERY')}
              >
                <CreditCard size={16} color={paymentMethod === 'CASH_ON_DELIVERY' ? GREEN : '#6b7280'} />
                <Text style={[styles.optionText, paymentMethod === 'CASH_ON_DELIVERY' && styles.optionTextSelected]}>
                  Dinheiro na entrega
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: sem cebola, campainha não funciona..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Cupom de desconto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cupom de desconto</Text>

          {appliedCoupon ? (
            <View style={styles.couponApplied}>
              <CheckCircle size={18} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedCode}>{appliedCoupon.code}</Text>
                <Text style={styles.couponAppliedDesc}>
                  {appliedCoupon.type === 'FREE_SHIPPING' && 'Frete grátis aplicado'}
                  {appliedCoupon.type === 'DISCOUNT_PERCENT' && `${appliedCoupon.value}% de desconto`}
                  {appliedCoupon.type === 'DISCOUNT_FIXED' && `${formatCurrency(appliedCoupon.value ?? 0)} de desconto`}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Código do cupom"
                value={couponInput}
                onChangeText={t => { setCouponInput(t.toUpperCase()); setCouponError(null) }}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleApplyCoupon}
              />
              <TouchableOpacity
                style={[styles.couponBtn, (!couponInput.trim() || couponLoading) && styles.couponBtnDisabled]}
                onPress={handleApplyCoupon}
                disabled={!couponInput.trim() || couponLoading}
              >
                {couponLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Tag size={16} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          )}

          {couponError && <Text style={styles.couponError}>{couponError}</Text>}
        </View>

        {/* Resumo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryQty}>{item.quantity}×</Text>
              <Text style={styles.summaryName}>{item.name}</Text>
              <Text style={styles.summaryPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
            </View>
          ))}
          {rawDeliveryFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryName, { flex: 1 }]}>Taxa de entrega</Text>
              <Text style={styles.summaryPrice}>
                {deliveryFee === 0 && appliedCoupon?.type === 'FREE_SHIPPING'
                  ? <Text style={styles.summaryStrike}>{formatCurrency(rawDeliveryFee)}</Text>
                  : formatCurrency(deliveryFee)
                }
              </Text>
            </View>
          )}
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryName, { flex: 1, color: '#16a34a' }]}>Desconto ({appliedCoupon?.code})</Text>
              <Text style={[styles.summaryPrice, { color: '#16a34a' }]}>-{formatCurrency(discountAmount)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeBtn, loading && styles.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.placeBtnText}>Fazer pedido · {formatCurrency(total)}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 12 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  companyName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  optionGroup: { gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  optionSelected: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  optionText: { fontSize: 14, color: '#374151', flex: 1 },
  optionTextSelected: { color: GREEN, fontWeight: '600' },

  // Driver selection
  driverOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  driverOptionSelected: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  driverAvatarWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  driverNameSelected: { color: '#3d6b2e' },
  driverVehicle: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  driverFeeWrap: { alignItems: 'flex-end' },
  driverFee: { fontSize: 14, fontWeight: '800', color: '#374151' },
  driverFeeSelected: { color: GREEN },
  driverFeeLabel: { fontSize: 11, color: '#9ca3af' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: GREEN },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },

  noDrivers: {
    alignItems: 'center', gap: 8, paddingVertical: 16,
  },
  noDriversTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  noDriversDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', textAlignVertical: 'top',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryQty: { fontSize: 13, color: '#9ca3af', width: 24 },
  summaryName: { fontSize: 14, color: '#374151', flex: 1 },
  summaryPrice: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  totalValue: { fontSize: 16, fontWeight: '800', color: GREEN },

  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  placeBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
  backBtn: { marginTop: 8, backgroundColor: GREEN_LIGHT, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: GREEN },

  // Coupon
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: {
    flex: 1,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
    letterSpacing: 1,
  },
  couponBtn: {
    backgroundColor: GREEN, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  couponBtnDisabled: { opacity: 0.5 },
  couponApplied: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  couponAppliedCode: { fontSize: 14, fontWeight: '700', color: '#15803d' },
  couponAppliedDesc: { fontSize: 12, color: '#16a34a', marginTop: 1 },
  couponError: { fontSize: 12, color: '#dc2626', marginTop: 2 },
  summaryStrike: { textDecorationLine: 'line-through', color: '#9ca3af' },
  optionSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  requiredBadge: {
    fontSize: 10, fontWeight: '700', color: GREEN,
    backgroundColor: GREEN_LIGHT, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
})
