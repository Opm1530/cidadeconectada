import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Package, MapPin, Phone, CheckCircle, Clock,
  ShoppingBag, Bike, Navigation, Radio,
} from 'lucide-react-native'
import { useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@cc/shared'
import { useRealtime } from '@/hooks/useRealtime'

const GREEN = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

interface Delivery {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED'
  order: {
    id: string
    number: number
    status: string
    deliveryAddress: string
    deliveryFee?: number | string | null
    company: { name: string }
    customer: { name: string; phone: string }
  }
}

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Disponível',     color: GREEN,     bg: GREEN_LIGHT    },
  ACCEPTED:  { label: 'Aceita',         color: '#d97706', bg: '#fef3c7'      },
  PICKED_UP: { label: 'A caminho',      color: '#2563eb', bg: '#eff6ff'      },
  DELIVERED: { label: 'Entregue',       color: '#6b7280', bg: '#f3f4f6'      },
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  CREATED:           'Aguardando',
  WAITING_PAYMENT:   'Aguard. pagamento',
  PAID:              'Pago',
  PREPARING:         'Preparando',
  READY_FOR_PICKUP:  '✅ Pronto para retirada!',
  OUT_FOR_DELIVERY:  'Saiu para entrega',
  DELIVERED:         'Entregue',
  CANCELLED:         'Cancelado',
}

export default function EntregasScreen() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [code, setCode] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-deliveries'],
    queryFn: () => api.get<Delivery[]>('/api/drivers/me/deliveries'),
    refetchInterval: 5_000,
  })

  const deliveries = (data as unknown as Delivery[]) ?? []

  // ── Tempo real: SSE → refetch imediato ao receber novo pedido/atualização ──
  useRealtime({ invalidateKeys: [['driver-deliveries']] })

  const acceptMutation = useMutation({
    mutationFn: (deliveryId: string) => api.patch(`/api/deliveries/${deliveryId}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] })
      Alert.alert('✅ Entrega aceita!', 'A loja foi notificada e vai começar o preparo.')
    },
    onError: (err: unknown) => {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível aceitar a entrega')
    },
  })

  const pickupMutation = useMutation({
    mutationFn: (deliveryId: string) => api.patch(`/api/deliveries/${deliveryId}/pickup`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] })
      Alert.alert('🛵 Ótimo!', 'Cliente notificado que o pedido saiu para entrega!')
    },
    onError: (err: unknown) => {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível registrar coleta')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: ({ deliveryId, confirmCode }: { deliveryId: string; confirmCode: string }) =>
      api.post(`/api/deliveries/${deliveryId}/confirm`, { code: confirmCode }),
    onSuccess: () => {
      setConfirmingId(null)
      setCode('')
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] })
      Alert.alert('🎉 Entrega concluída!', 'Parabéns, entrega confirmada com sucesso!')
    },
    onError: (err: unknown) => {
      Alert.alert('Código inválido', err instanceof Error ? err.message : 'Tente novamente')
    },
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Entregas</Text>
        </View>
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  // Agrupa: em andamento primeiro, depois disponíveis, depois histórivo
  const active   = deliveries.filter(d => d.status === 'ACCEPTED' || d.status === 'PICKED_UP')
  const pending  = deliveries.filter(d => d.status === 'PENDING')
  const finished = deliveries.filter(d => d.status === 'DELIVERED')
  const sorted   = [...active, ...pending, ...finished]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entregas</Text>
        {pending.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length} nova{pending.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        renderItem={({ item }) => <DeliveryCard
          item={item}
          onAccept={() => acceptMutation.mutate(item.id)}
          onPickup={() => pickupMutation.mutate(item.id)}
          onConfirm={() => { setConfirmingId(item.id); setCode('') }}
          isAccepting={acceptMutation.isPending}
          isPickingUp={pickupMutation.isPending}
        />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Radio size={44} color="#e5e7eb" />
            <Text style={styles.emptyTitle}>Aguardando pedidos</Text>
            <Text style={styles.emptyDesc}>Fique online para receber notificações de novas entregas</Text>
          </View>
        }
      />

      {/* Modal: código de confirmação */}
      <Modal visible={!!confirmingId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <CheckCircle size={32} color={GREEN} style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>Confirmar entrega</Text>
            <Text style={styles.modalSubtitle}>Digite o código de 4 dígitos do cliente:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0000"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              textAlign="center"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setConfirmingId(null); setCode('') }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!code || confirmMutation.isPending) && styles.modalConfirmDisabled]}
                onPress={() => {
                  if (confirmingId && code) {
                    confirmMutation.mutate({ deliveryId: confirmingId, confirmCode: code })
                  }
                }}
                disabled={!code || confirmMutation.isPending}
              >
                <Text style={styles.modalConfirmText}>
                  {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ── Card de entrega ───────────────────────────────────────────────────────────
function DeliveryCard({
  item, onAccept, onPickup, onConfirm, isAccepting, isPickingUp,
}: {
  item: Delivery
  onAccept: () => void
  onPickup: () => void
  onConfirm: () => void
  isAccepting: boolean
  isPickingUp: boolean
}) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING
  const orderStatus = item.order.status
  const isReadyForPickup = orderStatus === 'READY_FOR_PICKUP'
  const isDelivered = item.status === 'DELIVERED'

  return (
    <View style={[
      styles.card,
      item.status === 'PENDING' && styles.cardPending,
      item.status === 'ACCEPTED' && isReadyForPickup && styles.cardReady,
      isDelivered && styles.cardDone,
    ]}>
      {/* Header do card */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {item.order.deliveryFee != null && Number(item.order.deliveryFee) > 0 && (
          <Text style={styles.fee}>{formatCurrency(Number(item.order.deliveryFee))}</Text>
        )}
      </View>

      {/* Info da entrega */}
      <Text style={styles.companyName}>{item.order.company.name} · #{item.order.number}</Text>
      <Text style={styles.customerName}>{item.order.customer.name}</Text>

      <View style={styles.row}>
        <MapPin size={14} color="#6b7280" />
        <Text style={styles.address} numberOfLines={2}>{item.order.deliveryAddress}</Text>
      </View>

      {/* Linha de contato */}
      {item.order.customer.phone && item.status !== 'DELIVERED' && (
        <View style={styles.row}>
          <Phone size={14} color="#6b7280" />
          <Text style={styles.phone}>{item.order.customer.phone}</Text>
        </View>
      )}

      {/* Status do pedido (info para o entregador) */}
      {item.status === 'ACCEPTED' && (
        <View style={[
          styles.orderStatusRow,
          isReadyForPickup && styles.orderStatusRowReady,
        ]}>
          {isReadyForPickup
            ? <CheckCircle size={14} color={GREEN} />
            : <Clock size={14} color="#d97706" />
          }
          <Text style={[
            styles.orderStatusText,
            isReadyForPickup && styles.orderStatusTextReady,
          ]}>
            {ORDER_STATUS_LABEL[orderStatus] ?? orderStatus}
          </Text>
        </View>
      )}

      {/* Ações */}
      {item.status === 'PENDING' && (
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={onAccept}
          disabled={isAccepting}
        >
          <ShoppingBag size={16} color={GREEN} />
          <Text style={styles.acceptBtnText}>
            {isAccepting ? 'Aceitando...' : 'Aceitar entrega'}
          </Text>
        </TouchableOpacity>
      )}

      {item.status === 'ACCEPTED' && isReadyForPickup && (
        <TouchableOpacity
          style={styles.pickupBtn}
          onPress={onPickup}
          disabled={isPickingUp}
        >
          <Bike size={16} color="#fff" />
          <Text style={styles.pickupBtnText}>
            {isPickingUp ? 'Registrando...' : 'Coletei o pedido!'}
          </Text>
        </TouchableOpacity>
      )}

      {item.status === 'ACCEPTED' && !isReadyForPickup && (
        <View style={styles.waitingRow}>
          <Clock size={14} color="#d97706" />
          <Text style={styles.waitingText}>Aguardando o pedido ficar pronto</Text>
        </View>
      )}

      {item.status === 'PICKED_UP' && (
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={onConfirm}
        >
          <Navigation size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>Confirmar entrega</Text>
        </TouchableOpacity>
      )}

      {isDelivered && (
        <View style={styles.deliveredRow}>
          <CheckCircle size={14} color="#6b7280" />
          <Text style={styles.deliveredText}>Entrega concluída</Text>
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1 },
  badge: {
    backgroundColor: '#ef4444', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  list: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, gap: 6,
  },
  cardPending: { borderColor: GREEN_BORDER, borderWidth: 2 },
  cardReady: { borderColor: GREEN, borderWidth: 2, backgroundColor: '#fafff8' },
  cardDone: { opacity: 0.7 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  fee: { fontSize: 17, fontWeight: '800', color: '#111827' },

  companyName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  customerName: { fontSize: 13, color: '#6b7280' },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  address: { fontSize: 13, color: '#6b7280', flex: 1 },
  phone: { fontSize: 13, color: '#6b7280' },

  orderStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef3c7', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 4,
  },
  orderStatusRowReady: { backgroundColor: GREEN_LIGHT },
  orderStatusText: { fontSize: 13, fontWeight: '600', color: '#d97706' },
  orderStatusTextReady: { color: GREEN },

  // Botões
  acceptBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN_LIGHT, borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1, borderColor: GREEN_BORDER,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: GREEN },

  pickupBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12,
  },
  pickupBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  confirmBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  waitingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    backgroundColor: '#fef3c7', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  waitingText: { fontSize: 13, color: '#d97706', fontWeight: '600' },

  deliveredRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
  },
  deliveredText: { fontSize: 13, color: '#9ca3af' },

  empty: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  modalInput: {
    borderWidth: 2, borderColor: GREEN, borderRadius: 12,
    paddingVertical: 14, fontSize: 32, fontWeight: '800',
    color: '#111827', letterSpacing: 10,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, color: '#6b7280', fontWeight: '600' },
  modalConfirm: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: GREEN, alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.5 },
  modalConfirmText: { fontSize: 15, color: '#fff', fontWeight: '700' },
})
