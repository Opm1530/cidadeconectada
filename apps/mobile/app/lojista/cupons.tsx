import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Switch, Modal, ScrollView,
} from 'react-native'
import { Text } from '@/components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Tag, Trash2, X, ChevronDown } from 'lucide-react-native'
import { api } from '@/lib/api'
import { formatCurrency } from '@cc/shared'

const GREEN       = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'
const ORANGE      = '#f97316'

type CouponType = 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'FREE_SHIPPING'

interface Coupon {
  id: string; code: string; type: CouponType
  value: number | null; minOrder: number | null
  maxUses: number | null; usedCount: number
  active: boolean; expiresAt: string | null
}

const TYPE_LABELS: Record<CouponType, string> = {
  DISCOUNT_PERCENT: '% de desconto',
  DISCOUNT_FIXED:   'R$ de desconto',
  FREE_SHIPPING:    'Frete grátis',
}
const TYPE_COLORS: Record<CouponType, string> = {
  DISCOUNT_PERCENT: '#7c3aed',
  DISCOUNT_FIXED:   ORANGE,
  FREE_SHIPPING:    GREEN,
}

export default function CuponsScreen() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [code, setCode]         = useState('')
  const [type, setType]         = useState<CouponType>('DISCOUNT_PERCENT')
  const [value, setValue]       = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [maxUses, setMaxUses]   = useState('')
  const [showType, setShowType] = useState(false)

  const { data, isLoading } = useQuery<Coupon[]>({
    queryKey: ['my-coupons'],
    queryFn: () => api.get('/api/coupons'),
    staleTime: 0,
  })
  const coupons = (data as unknown as Coupon[]) ?? []

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/api/coupons', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-coupons'] })
      setShowModal(false)
      resetForm()
    },
    onError: (err: any) => Alert.alert('Erro', err?.message ?? 'Não foi possível criar o cupom.'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/coupons/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-coupons'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/coupons/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-coupons'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível excluir o cupom.'),
  })

  function resetForm() {
    setCode(''); setType('DISCOUNT_PERCENT'); setValue(''); setMinOrder(''); setMaxUses('')
  }

  function handleCreate() {
    if (!code.trim() || code.length < 2) {
      Alert.alert('Atenção', 'Digite o código do cupom (mínimo 2 caracteres).')
      return
    }
    if (type !== 'FREE_SHIPPING' && (!value || parseFloat(value) <= 0)) {
      Alert.alert('Atenção', 'Informe o valor do desconto.')
      return
    }
    createMutation.mutate({
      code: code.trim().toUpperCase(),
      type,
      value: type !== 'FREE_SHIPPING' ? parseFloat(value.replace(',', '.')) : undefined,
      minOrder: minOrder ? parseFloat(minOrder.replace(',', '.')) : undefined,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
    })
  }

  function confirmDelete(coupon: Coupon) {
    Alert.alert('Excluir cupom', `Deseja excluir o cupom "${coupon.code}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(coupon.id) },
    ])
  }

  function couponSummary(c: Coupon): string {
    if (c.type === 'FREE_SHIPPING') return 'Frete grátis'
    if (c.type === 'DISCOUNT_PERCENT') return `${c.value}% off`
    return `${formatCurrency(Number(c.value))} off`
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
      <View style={s.header}>
        <View>
          <Text style={s.title}>Cupons</Text>
          <Text style={s.subtitle}>{coupons.length} cupom{coupons.length !== 1 ? 'ns' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {coupons.length === 0 ? (
        <View style={s.empty}>
          <Tag size={52} color="#e5e7eb" strokeWidth={1.5} />
          <Text style={s.emptyTitle}>Nenhum cupom criado</Text>
          <Text style={s.emptySub}>Crie cupons de desconto ou frete grátis para seus clientes</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Plus size={16} color="#fff" />
            <Text style={s.emptyBtnText}>Criar cupom</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: c }) => (
            <View style={[s.card, !c.active && s.cardInactive]}>
              <View style={[s.codeTag, { backgroundColor: `${TYPE_COLORS[c.type]}15` }]}>
                <Text style={[s.codeText, { color: TYPE_COLORS[c.type] }]}>{c.code}</Text>
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardSummary}>{couponSummary(c)}</Text>
                <Text style={s.cardMeta}>
                  {c.usedCount} uso{c.usedCount !== 1 ? 's' : ''}
                  {c.maxUses ? ` / ${c.maxUses}` : ''}
                  {c.minOrder ? ` · Mín. ${formatCurrency(Number(c.minOrder))}` : ''}
                </Text>
                <View style={[s.typePill, { backgroundColor: `${TYPE_COLORS[c.type]}15` }]}>
                  <Text style={[s.typePillText, { color: TYPE_COLORS[c.type] }]}>
                    {TYPE_LABELS[c.type]}
                  </Text>
                </View>
              </View>
              <View style={s.cardActions}>
                <Switch
                  value={c.active}
                  onValueChange={v => toggleMutation.mutate({ id: c.id, active: v })}
                  trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }}
                  thumbColor={c.active ? GREEN : '#f3f4f6'}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(c)} activeOpacity={0.7}>
                  <Trash2 size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ── Modal criar cupom ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo cupom</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm() }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">

            <Field label="Código do cupom *">
              <TextInput
                style={s.input}
                value={code}
                onChangeText={v => setCode(v.toUpperCase())}
                placeholder="Ex: DESCONTO10"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
              />
              <Text style={s.hint}>O cliente digitará este código no checkout</Text>
            </Field>

            <Field label="Tipo *">
              <TouchableOpacity style={s.picker} onPress={() => setShowType(!showType)} activeOpacity={0.8}>
                <Text style={s.pickerValue}>{TYPE_LABELS[type]}</Text>
                <ChevronDown size={16} color="#9ca3af" />
              </TouchableOpacity>
              {showType && (
                <View style={s.dropdown}>
                  {(Object.entries(TYPE_LABELS) as [CouponType, string][]).map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={[s.dropdownItem, k === type && s.dropdownItemActive]}
                      onPress={() => { setType(k); setShowType(false) }}
                    >
                      <Text style={[s.dropdownText, k === type && s.dropdownTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            {type !== 'FREE_SHIPPING' && (
              <Field label={type === 'DISCOUNT_PERCENT' ? 'Percentual (%) *' : 'Valor em R$ *'}>
                <TextInput
                  style={s.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder={type === 'DISCOUNT_PERCENT' ? 'Ex: 10' : 'Ex: 5.00'}
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </Field>
            )}

            {type === 'FREE_SHIPPING' && (
              <View style={s.infoBox}>
                <Text style={s.infoText}>
                  🚚 Frete grátis é aplicado apenas quando a loja faz a entrega (entrega própria).
                </Text>
              </View>
            )}

            <Field label="Pedido mínimo (R$)">
              <TextInput
                style={s.input}
                value={minOrder}
                onChangeText={setMinOrder}
                placeholder="Sem mínimo (opcional)"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </Field>

            <Field label="Limite de usos">
              <TextInput
                style={s.input}
                value={maxUses}
                onChangeText={setMaxUses}
                placeholder="Ilimitado (opcional)"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
              />
            </Field>

            <TouchableOpacity
              style={[s.createBtn, createMutation.isPending && { opacity: 0.7 }]}
              onPress={handleCreate}
              activeOpacity={0.85}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.createBtnText}>Criar cupom</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>{children}</View>
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
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
  cardInactive: { opacity: 0.5 },
  codeTag: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, minWidth: 80, alignItems: 'center',
  },
  codeText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  cardInfo: { flex: 1, gap: 3 },
  cardSummary: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#9ca3af' },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2,
  },
  typePillText: { fontSize: 11, fontWeight: '700' },
  cardActions: { alignItems: 'center', gap: 8 },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151' },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Modal
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalContent: { padding: 20, gap: 14 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fafafa',
  },
  hint: { fontSize: 11, color: '#9ca3af' },

  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa',
  },
  pickerValue: { fontSize: 14, color: '#111827' },
  dropdown: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    backgroundColor: '#fff', overflow: 'hidden', marginTop: 4,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownText: { fontSize: 14, color: '#374151' },
  dropdownTextActive: { color: GREEN, fontWeight: '700' },

  infoBox: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: GREEN_BORDER,
    borderRadius: 12, padding: 14,
  },
  infoText: { fontSize: 13, color: '#166534', lineHeight: 19 },

  createBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
})
