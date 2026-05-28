import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CheckCircle, ChefHat, Bike, Package, ShoppingBag, Clock, Copy } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import QRCode from 'react-native-qrcode-svg'
import { api } from '@/lib/api'
import { formatCurrency } from '@cc/shared'
import { useRealtime } from '@/hooks/useRealtime'
import { generatePixPayload } from '@/utils/pix'

interface OrderDetail {
  id: string
  number: number
  status: string
  deliveryType: string
  total: number
  company: { name: string }
  items: { id: string; quantity: number; unitPrice: number; productName: string; product?: { name: string } }[]
  deliveryAddress: string | null
  delivery?: { status: string; confirmationCode: string } | null
  payment?: {
    method: string
    status: string
    pixKey?: string | null
    amount: number
    mercadoPagoCheckoutUrl?: string | null
  } | null
}

// ── Entregador da plataforma ──────────────────────────────────────────────────
// Tem passo extra: "Aguardando entregador aceitar" (baseado em delivery.status)
const STEPS_PLATFORM = [
  { key: 'CREATED',           label: 'Pedido criado',               icon: ShoppingBag },
  { key: 'PAID',              label: 'Pagamento confirmado',         icon: CheckCircle },
  { key: 'DRIVER_ACCEPTED',   label: 'Entregador confirmou',         icon: Bike       }, // pseudo-step
  { key: 'PREPARING',         label: 'Em preparo',                   icon: ChefHat    },
  { key: 'READY_FOR_PICKUP',  label: 'Aguardando retirada',          icon: Package    },
  { key: 'OUT_FOR_DELIVERY',  label: 'Saiu para entrega',            icon: Bike       },
  { key: 'DELIVERED',         label: 'Entregue',                     icon: CheckCircle },
]

// ── Entrega própria da loja ───────────────────────────────────────────────────
const STEPS_OWN = [
  { key: 'CREATED',           label: 'Pedido criado',        icon: ShoppingBag },
  { key: 'PAID',              label: 'Pagamento confirmado',  icon: CheckCircle },
  { key: 'PREPARING',         label: 'Em preparo',            icon: ChefHat    },
  { key: 'READY_FOR_PICKUP',  label: 'Pedido pronto',         icon: Package    },
  { key: 'OUT_FOR_DELIVERY',  label: 'Saiu para entrega',     icon: Bike       },
  { key: 'DELIVERED',         label: 'Entregue',              icon: Package    },
]

// ── Retirada no local ─────────────────────────────────────────────────────────
const STEPS_PICKUP = [
  { key: 'CREATED',           label: 'Pedido criado',         icon: ShoppingBag },
  { key: 'PAID',              label: 'Pagamento confirmado',   icon: CheckCircle },
  { key: 'PREPARING',         label: 'Em preparo',             icon: ChefHat    },
  { key: 'READY_FOR_PICKUP',  label: 'Pronto para retirada',   icon: Package    },
  { key: 'DELIVERED',         label: 'Retirado',               icon: CheckCircle },
]

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Criado', PAID: 'Pago', PREPARING: 'Em preparo',
  READY_FOR_PICKUP: 'Pronto', OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
}

/**
 * Para pedidos PLATFORM_DRIVER o índice ativo combina order.status + delivery.status.
 * O pseudo-passo DRIVER_ACCEPTED (idx=2) é marcado como feito quando o entregador aceita.
 *
 * STEPS_PLATFORM:
 *  0 CREATED | 1 PAID | 2 DRIVER_ACCEPTED | 3 PREPARING | 4 READY_FOR_PICKUP | 5 OUT_FOR_DELIVERY | 6 DELIVERED
 */
function getPlatformCurrentIdx(o: OrderDetail): number {
  const driverAccepted = o.delivery && o.delivery.status !== 'PENDING'
  switch (o.status) {
    case 'CREATED':          return 0
    case 'PAID':             return driverAccepted ? 2 : 1
    case 'PREPARING':        return 3
    case 'READY_FOR_PICKUP': return 4
    case 'OUT_FOR_DELIVERY': return 5
    case 'DELIVERED':        return 6
    default:                 return 0
  }
}

export default function PedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<OrderDetail>(`/api/orders/${id}`),
    enabled: !!id,
    refetchInterval: 5_000,
  })

  useRealtime({
    invalidateKeys: [['order', id]],
    params: id ? { orderId: id } : {},
    enabled: !!id,
  })

  if (isLoading) return (
    <SafeAreaView style={styles.center} edges={['bottom','left','right']}>
      <ActivityIndicator color="#62a84a" />
    </SafeAreaView>
  )

  const o = order as unknown as OrderDetail

  if (!o) return (
    <SafeAreaView style={styles.center} edges={['bottom','left','right']}>
      <Text style={styles.notFound}>Pedido não encontrado</Text>
    </SafeAreaView>
  )

  const isPlatform  = o.deliveryType === 'PLATFORM_DRIVER'
  const steps       =
    o.deliveryType === 'PICKUP'  ? STEPS_PICKUP   :
    isPlatform                   ? STEPS_PLATFORM :
                                   STEPS_OWN

  const currentIdx  = isPlatform
    ? getPlatformCurrentIdx(o)
    : steps.findIndex((s) => s.key === o.status)

  const isCancelled = o.status === 'CANCELLED'

  // Aguardando entregador aceitar: só mostra quando delivery ainda está PENDING
  const waitingDriver = isPlatform && o.delivery?.status === 'PENDING'

  const showPixPending    = o.payment?.method === 'PIX' && o.payment?.status === 'PENDING'
  const showPixConfirmed  = o.payment?.method === 'PIX' && o.payment?.status === 'CONFIRMED'
  const showMpPending     = o.payment?.method === 'MERCADO_PAGO' && o.payment?.status === 'PENDING'
  const showCashOnDelivery = o.payment?.method === 'CASH_ON_DELIVERY'

  const pixPayload = showPixPending && o.payment?.pixKey
    ? generatePixPayload({
        key: o.payment.pixKey,
        amount: Number(o.payment.amount ?? o.total),
        merchantName: o.company.name,
        txId: o.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25),
        description: `Pedido #${o.number}`,
      })
    : null

  async function copyPixKey() {
    const toCopy = pixPayload ?? o.payment?.pixKey
    if (!toCopy) return
    await Clipboard.setStringAsync(toCopy)
    Alert.alert('Copiado!', 'Código Pix copiado para a área de transferência. Cole no seu banco.')
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.orderNum}>Pedido #{o.number}</Text>
          <Text style={styles.companyName}>{o.company.name}</Text>
          <View style={[styles.statusBadge, isCancelled && { backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.statusText, isCancelled && { color: '#dc2626' }]}>
              {STATUS_LABELS[o.status] ?? o.status}
            </Text>
          </View>
        </View>

        {/* Banner "aguardando entregador" — só para PLATFORM_DRIVER enquanto não aceita */}
        {waitingDriver && (
          <View style={styles.waitingBanner}>
            <Clock size={16} color="#d97706" />
            <Text style={styles.waitingText}>Aguardando um entregador aceitar o pedido…</Text>
          </View>
        )}

        {/* Card de pagamento Pix pendente */}
        {showPixPending && (
          <View style={styles.pixCard}>
            <Text style={styles.pixTitle}>⏳ Aguardando pagamento Pix</Text>
            <Text style={styles.pixDesc}>
              Escaneie o QR Code ou copie o código abaixo e cole no seu banco.
            </Text>

            {/* QR Code */}
            {pixPayload && (
              <View style={styles.pixQrWrap}>
                <QRCode
                  value={pixPayload}
                  size={200}
                  color="#111827"
                  backgroundColor="#fff"
                />
              </View>
            )}

            {/* Valor */}
            <View style={styles.pixAmountRow}>
              <Text style={styles.pixAmountLabel}>Valor</Text>
              <Text style={styles.pixAmountValue}>{formatCurrency(Number(o.payment?.amount ?? o.total))}</Text>
            </View>

            {/* Copia e cola */}
            <TouchableOpacity style={styles.pixCopyFullBtn} onPress={copyPixKey} activeOpacity={0.7}>
              <Copy size={15} color="#92400e" />
              <Text style={styles.pixCopyFullText}>Copiar código Pix (copia e cola)</Text>
            </TouchableOpacity>

            <Text style={styles.pixNote}>
              Após pagar, aguarde a confirmação do lojista para o pedido seguir.
            </Text>
          </View>
        )}

        {/* Pix já confirmado */}
        {showPixConfirmed && (
          <View style={styles.pixConfirmedCard}>
            <CheckCircle size={18} color="#16a34a" />
            <Text style={styles.pixConfirmedText}>Pagamento Pix confirmado</Text>
          </View>
        )}

        {/* Mercado Pago pendente — volta para abrir o checkout */}
        {showMpPending && o.payment?.mercadoPagoCheckoutUrl && (
          <View style={styles.mpCard}>
            <Text style={styles.mpTitle}>💳 Pagamento via Mercado Pago</Text>
            <Text style={styles.mpDesc}>
              Seu pedido foi criado. Conclua o pagamento para confirmar.
            </Text>
            <TouchableOpacity
              style={styles.mpBtn}
              onPress={() => WebBrowser.openBrowserAsync((o.payment as any).mercadoPagoCheckoutUrl)}
              activeOpacity={0.8}
            >
              <Text style={styles.mpBtnText}>Pagar agora</Text>
            </TouchableOpacity>
          </View>
        )}
        {showMpPending && !o.payment?.mercadoPagoCheckoutUrl && (
          <View style={styles.mpCard}>
            <Text style={styles.mpTitle}>💳 Aguardando pagamento</Text>
            <Text style={styles.mpDesc}>Processando o link de pagamento…</Text>
          </View>
        )}

        {/* Pagamento na entrega */}
        {showCashOnDelivery && (
          <View style={styles.cashCard}>
            <Text style={styles.cashText}>
              💵 Pagamento na entrega · Tenha {formatCurrency(Number(o.total))} em mãos
            </Text>
          </View>
        )}

        {/* Timeline */}
        {!isCancelled && (
          <View style={styles.timeline}>
            {steps.map((step, idx) => {
              const Icon   = step.icon
              const done   = idx <= currentIdx
              const active = idx === currentIdx
              return (
                <View key={step.key} style={styles.step}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepCircle,
                      done   && styles.stepCircleDone,
                      active && styles.stepCircleActive,
                    ]}>
                      <Icon size={14} color={done ? '#fff' : '#d1d5db'} />
                    </View>
                    {idx < steps.length - 1 && (
                      <View style={[styles.stepLine, done && styles.stepLineDone]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Itens */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens</Text>
          {o.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName}>{item.productName ?? item.product?.name ?? 'Produto'}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(Number(item.unitPrice) * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Código de confirmação — só para PLATFORM_DRIVER quando saiu para entrega */}
        {isPlatform && o.status === 'OUT_FOR_DELIVERY' && o.delivery?.confirmationCode && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Código de confirmação</Text>
            <Text style={styles.codeSubLabel}>
              Mostre este código ao entregador na hora da entrega
            </Text>
            <View style={styles.codeRow}>
              {o.delivery.confirmationCode.split('').map((digit, i) => (
                <View key={i} style={styles.codeDigit}>
                  <Text style={styles.codeDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Endereço */}
        {o.deliveryAddress && o.deliveryType !== 'PICKUP' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Endereço de entrega</Text>
            <Text style={styles.address}>{o.deliveryAddress}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(Number(o.total))}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:    { color: '#9ca3af', fontSize: 15 },

  header: {
    backgroundColor: '#fff', padding: 20,
    alignItems: 'center', gap: 6,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  orderNum:    { fontSize: 22, fontWeight: '800', color: '#111827' },
  companyName: { fontSize: 14, color: '#6b7280' },
  statusBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  statusText:  { fontSize: 13, fontWeight: '700', color: '#62a84a' },

  waitingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 0,
    backgroundColor: '#fffbeb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#fde68a',
  },
  waitingText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '500' },

  timeline:       { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 20 },
  step:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepLeft:       { alignItems: 'center', width: 28 },
  stepCircle:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  stepCircleDone: { backgroundColor: '#62a84a' },
  stepCircleActive: { backgroundColor: '#62a84a', shadowColor: '#62a84a', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  stepLine:       { width: 2, height: 24, backgroundColor: '#e5e7eb', marginVertical: 2 },
  stepLineDone:   { backgroundColor: '#62a84a' },
  stepLabel:      { fontSize: 14, color: '#9ca3af', paddingTop: 5, paddingBottom: 20 },
  stepLabelDone:  { color: '#111827', fontWeight: '600' },

  section:      { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 2 },
  item:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty:      { fontSize: 14, color: '#9ca3af', width: 24 },
  itemName:     { flex: 1, fontSize: 14, color: '#111827' },
  itemPrice:    { fontSize: 14, fontWeight: '600', color: '#111827' },
  address:      { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  codeCard: {
    backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: '#d1f0c8',
  },
  codeLabel:    { fontSize: 14, fontWeight: '800', color: '#111827' },
  codeSubLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
  codeRow:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  codeDigit: {
    width: 52, height: 64, borderRadius: 12,
    backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#62a84a',
    alignItems: 'center', justifyContent: 'center',
  },
  codeDigitText: { fontSize: 32, fontWeight: '900', color: '#62a84a', letterSpacing: 0 },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#62a84a' },

  // Pix pending
  pixCard: {
    margin: 16, marginBottom: 0,
    backgroundColor: '#fffbeb', borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1.5, borderColor: '#fde68a',
  },
  pixTitle: { fontSize: 15, fontWeight: '800', color: '#92400e' },
  pixDesc: { fontSize: 13, color: '#78350f', lineHeight: 18 },
  pixQrWrap: {
    alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#fde68a',
  },
  pixAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pixAmountLabel: { fontSize: 13, color: '#92400e' },
  pixAmountValue: { fontSize: 20, fontWeight: '900', color: '#92400e' },
  pixCopyFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  pixCopyFullText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  pixNote: { fontSize: 12, color: '#a16207', textAlign: 'center', lineHeight: 17 },

  // Pix confirmed
  pixConfirmedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 0,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  pixConfirmedText: { fontSize: 14, fontWeight: '700', color: '#16a34a' },

  // Mercado Pago pending
  mpCard: {
    margin: 16, marginBottom: 0,
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, gap: 10,
    borderWidth: 1.5, borderColor: '#bfdbfe',
  },
  mpTitle: { fontSize: 15, fontWeight: '800', color: '#1e40af' },
  mpDesc: { fontSize: 13, color: '#1e3a8a', lineHeight: 18 },
  mpBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  mpBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Cash on delivery
  cashCard: {
    margin: 16, marginBottom: 0,
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cashText: { fontSize: 14, color: '#374151', lineHeight: 20 },
})
