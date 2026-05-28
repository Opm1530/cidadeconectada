import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package, Clock, CheckCircle, XCircle,
  ChevronRight, Bike, ShoppingBag, Store, CreditCard, Radio,
} from 'lucide-react-native'
import { useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@cc/shared'
import { useRealtime } from '@/hooks/useRealtime'

const GREEN = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DayHours { enabled: boolean; open: string; close: string }

interface MyCompany {
  id: string; name: string; slug: string; active: boolean; category: string | null
  isOpen: boolean
  openingHours: Record<string, DayHours> | null
}

interface OrderItem {
  id: string; productName: string; quantity: number; unitPrice: number; totalPrice: number; notes?: string
}

interface Order {
  id: string; number: number; status: string; deliveryType: string
  total: number; subtotal: number; deliveryFee: number; notes?: string; createdAt: string
  customer: { name: string; phone?: string }
  delivery?: { status: string; driver?: { user: { name: string } } }
  payment?: { method: string; status: string }
  items: OrderItem[]
}

// ── Configs ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next?: string; nextLabel?: string }> = {
  CREATED:          { label: 'Novo pedido',        color: '#16a34a', bg: '#f0fdf4',  next: 'PREPARING',        nextLabel: '▶ Iniciar preparo'     },
  WAITING_PAYMENT:  { label: 'Aguard. pagamento',  color: '#d97706', bg: '#fef3c7'                                                                },
  PAID:             { label: 'Pago',               color: '#2563eb', bg: '#eff6ff',  next: 'PREPARING',        nextLabel: '▶ Iniciar preparo'     },
  PREPARING:        { label: 'Preparando…',        color: '#d97706', bg: '#fef3c7',  next: 'READY_FOR_PICKUP', nextLabel: '✅ Marcar como pronto'  },
  READY_FOR_PICKUP: { label: 'Pronto ✅',          color: GREEN,     bg: GREEN_LIGHT, next: 'OUT_FOR_DELIVERY', nextLabel: '🛵 Saiu para entrega'  },
  OUT_FOR_DELIVERY: { label: 'A caminho…',         color: '#2563eb', bg: '#eff6ff',  next: 'DELIVERED',        nextLabel: '📦 Confirmar entrega'  },
  DELIVERED:        { label: 'Entregue',           color: '#6b7280', bg: '#f3f4f6'                                                                },
  CANCELLED:        { label: 'Cancelado',          color: '#ef4444', bg: '#fef2f2'                                                                },
}

const DELIVERY_ICON: Record<string, React.ElementType> = {
  PICKUP: Store, OWN_DELIVERY: Bike, PLATFORM_DRIVER: Bike,
}

const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'Pix', CASH_ON_DELIVERY: 'Dinheiro', MERCADO_PAGO: 'Mercado Pago',
}

const ACTIVE_STATUSES = ['CREATED', 'WAITING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']

// ── Tela principal ────────────────────────────────────────────────────────────

export default function LojistaPedidos() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const [refreshing, setRefreshing] = useState(false)

  // Dados da loja
  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => api.get<MyCompany>('/api/companies/me'),
  })
  const company = companyData as unknown as MyCompany | null

  // Toggle abrir/fechar loja (usa isOpen, não active)
  const { mutate: toggleStore, isPending: toggling } = useMutation({
    mutationFn: (isOpen: boolean) => api.patch('/api/companies/me', { isOpen }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-company'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o status da loja.'),
  })

  // Pedidos
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['merchant-orders'],
    queryFn: () => api.get<{ data: Order[] }>('/api/orders?perPage=50'),
    refetchInterval: 5_000,
  })

  const orders = (ordersData as unknown as { data: Order[] })?.data ?? []

  // ── Tempo real: SSE → invalida queries ao receber qualquer evento ──
  useRealtime({ invalidateKeys: [['merchant-orders'], ['my-company']] })
  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const doneOrders   = orders.filter(o => !ACTIVE_STATUSES.includes(o.status))
  const displayed    = tab === 'active' ? activeOrders : doneOrders

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.patch(`/api/orders/${orderId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-orders'] }),
    onError: (err: unknown) => Alert.alert('Erro', err instanceof Error ? err.message : 'Tente novamente'),
  })

  const { mutate: confirmPayment } = useMutation({
    mutationFn: (orderId: string) => api.patch(`/api/orders/${orderId}`, { action: 'confirm_payment' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-orders'] }),
    onError: (err: unknown) => Alert.alert('Erro', err instanceof Error ? err.message : 'Tente novamente'),
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const isOpen = company?.isOpen ?? false

  // Horário de hoje
  const todayKey = String(new Date().getDay()) // 0=Dom … 6=Sáb
  const todayHours = company?.openingHours?.[todayKey] ?? null
  const todayLabel = todayHours?.enabled
    ? `Hoje: ${todayHours.open} – ${todayHours.close}`
    : 'Sem horário definido para hoje'

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header da loja ── */}
      <View style={[styles.storeHeader, isOpen ? styles.storeHeaderOpen : styles.storeHeaderClosed]}>
        <View style={styles.storeInfo}>
          <View style={[styles.storeIcon, { backgroundColor: isOpen ? GREEN : '#9ca3af' }]}>
            <Store size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.storeName}>{company?.name ?? '…'}</Text>
            <View style={styles.storeStatusRow}>
              <Radio size={10} color={isOpen ? GREEN : '#9ca3af'} />
              <Text style={[styles.storeStatusText, { color: isOpen ? GREEN : '#9ca3af' }]}>
                {isOpen ? 'Aberta agora' : 'Fechada'}
              </Text>
            </View>
            <Text style={styles.todayHours}>{todayLabel}</Text>
          </View>
        </View>
        <View style={styles.toggleWrap}>
          <Text style={styles.toggleLabel}>{isOpen ? 'Fechar' : 'Abrir'}</Text>
          <Switch
            value={isOpen}
            onValueChange={(val) => {
              if (val && !todayHours?.enabled) {
                Alert.alert(
                  'Sem horário configurado',
                  'Hoje não tem horário definido. Deseja abrir mesmo assim?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir', onPress: () => toggleStore(true) },
                  ]
                )
              } else {
                toggleStore(val)
              }
            }}
            disabled={toggling}
            trackColor={{ false: '#e5e7eb', true: GREEN }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            Em andamento{activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}
          </Text>
          {activeOrders.some(o => o.status === 'CREATED') && (
            <View style={styles.tabDot} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'done' && styles.tabActive]}
          onPress={() => setTab('done')}
        >
          <Text style={[styles.tabText, tab === 'done' && styles.tabTextActive]}>
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Lista ── */}
      {isLoading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onUpdateStatus={(status) => updateStatus({ orderId: item.id, status })}
              onConfirmPayment={() => confirmPayment(item.id)}
              updating={updating}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ShoppingBag size={44} color="#e5e7eb" />
              <Text style={styles.emptyTitle}>
                {tab === 'active' ? 'Nenhum pedido em andamento' : 'Histórico vazio'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

// ── Card de pedido ────────────────────────────────────────────────────────────

function OrderCard({
  order, onUpdateStatus, onConfirmPayment, updating,
}: {
  order: Order
  onUpdateStatus: (s: string) => void
  onConfirmPayment: () => void
  updating: boolean
}) {
  const [expanded, setExpanded] = useState(order.status === 'CREATED')
  const DlIcon = DELIVERY_ICON[order.deliveryType] ?? Store
  const isPixPending      = order.payment?.method === 'PIX' && order.payment?.status === 'PENDING'
  // Driver ainda não aceitou (ou delivery ainda não existe)
  const isAwaitingDriver  = order.deliveryType === 'PLATFORM_DRIVER'
    && (order.delivery == null || order.delivery.status === 'PENDING')
  // Driver aceitou mas loja ainda não iniciou preparo
  const isDriverAccepted  = order.deliveryType === 'PLATFORM_DRIVER'
    && order.delivery?.status === 'ACCEPTED'
    && order.status === 'CREATED'
  // Bloquear ação principal enquanto aguarda entregador ou aguarda Pix
  const blockAction       = isAwaitingDriver || isPixPending
  // Rótulo do status — sobrescreve para pedidos aguardando entregador
  const baseCfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: '#6b7280', bg: '#f3f4f6' }
  const cfg = isAwaitingDriver
    ? { ...baseCfg, label: 'Aguard. entregador…', color: '#d97706', bg: '#fef3c7' }
    : baseCfg

  // Próximo status e label dependem do tipo de entrega
  const resolvedNext = (() => {
    // Retirada: cliente vem buscar → confirma diretamente como DELIVERED
    if (order.deliveryType === 'PICKUP' && order.status === 'READY_FOR_PICKUP')
      return 'DELIVERED'
    // Entrega própria: pronto → saiu para entrega
    if (order.deliveryType === 'OWN_DELIVERY' && order.status === 'READY_FOR_PICKUP')
      return 'OUT_FOR_DELIVERY'
    // Entrega própria: saiu → confirma entregue
    if (order.deliveryType === 'OWN_DELIVERY' && order.status === 'OUT_FOR_DELIVERY')
      return 'DELIVERED'
    // Entregador da plataforma: quando saiu pra entrega, só o driver confirma com código
    if (order.deliveryType === 'PLATFORM_DRIVER' && order.status === 'OUT_FOR_DELIVERY')
      return undefined
    return cfg.next
  })()
  const resolvedNextLabel = (() => {
    if (order.deliveryType === 'PICKUP' && order.status === 'READY_FOR_PICKUP')
      return '✅ Confirmar retirada'
    if (order.deliveryType === 'OWN_DELIVERY' && order.status === 'READY_FOR_PICKUP')
      return '🛵 Saiu para entrega'
    if (order.deliveryType === 'OWN_DELIVERY' && order.status === 'OUT_FOR_DELIVERY')
      return '📦 Confirmar entrega'
    return cfg.nextLabel
  })()
  const isNew             = order.status === 'CREATED'

  return (
    <View style={[styles.card, isNew && styles.cardNew, order.status === 'READY_FOR_PICKUP' && styles.cardReady]}>

      {/* Topo */}
      <TouchableOpacity style={styles.cardTop} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.orderNum}>#{order.number}</Text>
        <Text style={styles.orderTime}>
          {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <ChevronRight
          size={16} color="#9ca3af"
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {/* Cliente + valor */}
      <View style={styles.cardRow}>
        <Text style={styles.customerName}>{order.customer.name}</Text>
        <Text style={styles.totalText}>{formatCurrency(Number(order.total))}</Text>
      </View>

      {/* Tipo de entrega + pagamento */}
      <View style={styles.cardMeta}>
        <DlIcon size={12} color="#9ca3af" />
        <Text style={styles.metaText}>
          {order.deliveryType === 'PICKUP' ? 'Retirada' : order.deliveryType === 'OWN_DELIVERY' ? 'Entrega própria' : 'Entregador'}
        </Text>
        <Text style={styles.metaSep}>·</Text>
        <CreditCard size={12} color="#9ca3af" />
        <Text style={styles.metaText}>{PAYMENT_LABEL[order.payment?.method ?? ''] ?? '-'}</Text>
      </View>

      {/* Expandido: itens */}
      {expanded && (
        <View style={styles.itemsBox}>
          {order.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(Number(item.totalPrice))}</Text>
            </View>
          ))}
          {order.notes ? <Text style={styles.notes}>📝 {order.notes}</Text> : null}
          {order.delivery?.driver ? (
            <View style={styles.driverRow}>
              <Bike size={12} color={GREEN} />
              <Text style={styles.driverText}>{order.delivery.driver.user.name}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Avisos de estado */}
      {isAwaitingDriver && (
        <View style={styles.alertRow}>
          <Clock size={13} color="#d97706" />
          <Text style={styles.alertText}>⏳ Aguardando entregador aceitar…</Text>
        </View>
      )}
      {isDriverAccepted && (
        <View style={[styles.alertRow, styles.alertGreen]}>
          <CheckCircle size={13} color={GREEN} />
          <Text style={[styles.alertText, { color: GREEN }]}>
            ✅ {order.delivery?.driver?.user.name ?? 'Entregador'} confirmou! Pode preparar.
          </Text>
        </View>
      )}
      {isPixPending && !isAwaitingDriver && (
        <TouchableOpacity style={styles.pixRow} onPress={onConfirmPayment}>
          <CreditCard size={14} color="#2563eb" />
          <Text style={styles.pixText}>Toque para confirmar recebimento do Pix</Text>
        </TouchableOpacity>
      )}

      {/* Ação principal */}
      {resolvedNext && !blockAction && (
        <TouchableOpacity
          style={[styles.actionBtn, updating && styles.actionBtnDisabled]}
          onPress={() => onUpdateStatus(resolvedNext)}
          disabled={updating}
        >
          <Text style={styles.actionBtnText}>{resolvedNextLabel}</Text>
        </TouchableOpacity>
      )}

      {/* Aviso quando entregador da plataforma está com o pedido */}
      {order.deliveryType === 'PLATFORM_DRIVER' && order.status === 'OUT_FOR_DELIVERY' && (
        <View style={styles.alertRow}>
          <Bike size={13} color="#2563eb" />
          <Text style={[styles.alertText, { color: '#2563eb' }]}>
            Entregador a caminho — aguardando confirmação de entrega
          </Text>
        </View>
      )}

      {/* Cancelar */}
      {['CREATED', 'PAID', 'PREPARING'].includes(order.status) && !blockAction && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() =>
            Alert.alert('Cancelar pedido?', 'Esta ação não pode ser desfeita.', [
              { text: 'Não', style: 'cancel' },
              { text: 'Cancelar pedido', style: 'destructive', onPress: () => onUpdateStatus('CANCELLED') },
            ])
          }
        >
          <XCircle size={13} color="#ef4444" />
          <Text style={styles.cancelText}>Cancelar pedido</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header da loja
  storeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  storeHeaderOpen:   { borderBottomColor: GREEN_BORDER },
  storeHeaderClosed: { borderBottomColor: '#f3f4f6' },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  storeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  storeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  storeStatusText: { fontSize: 12, fontWeight: '600' },
  todayHours: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  toggleWrap: { alignItems: 'center', gap: 2 },
  toggleLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: GREEN },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: GREEN },
  tabDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },

  list: { padding: 12, gap: 10, paddingBottom: 40 },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 8,
  },
  cardNew:   { borderColor: GREEN,        borderWidth: 2, backgroundColor: '#fafff8' },
  cardReady: { borderColor: '#d97706',    borderWidth: 2, backgroundColor: '#fffef5' },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, flex: 1 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  orderNum: { fontSize: 14, fontWeight: '700', color: '#374151' },
  orderTime: { fontSize: 12, color: '#9ca3af' },

  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalText: { fontSize: 16, fontWeight: '800', color: '#111827' },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  metaSep: { fontSize: 12, color: '#d1d5db' },

  // Itens expandidos
  itemsBox: { gap: 5, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemQty: { fontSize: 13, color: '#9ca3af', width: 22 },
  itemName: { fontSize: 14, color: '#374151', flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notes: { fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  driverText: { fontSize: 13, color: GREEN, fontWeight: '600' },

  // Alertas
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  alertText: { fontSize: 12, fontWeight: '600', color: '#d97706' },
  alertGreen: { backgroundColor: GREEN_LIGHT, borderWidth: 1, borderColor: GREEN_BORDER },
  pixRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  pixText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },

  // Botões
  actionBtn: {
    backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6,
  },
  cancelText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },

  // Vazio
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 15, color: '#9ca3af', fontWeight: '600' },
})
