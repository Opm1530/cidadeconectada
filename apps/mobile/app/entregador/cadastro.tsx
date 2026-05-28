import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Bike, CheckCircle, Car, ClipboardList,
  Clock, XCircle, ChevronRight, DollarSign, Users,
} from 'lucide-react-native'
import { api } from '@/lib/api'
import { useCityStore } from '@/store/city'
import { useAuthStore } from '@/store/auth'

const GREEN = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

const VEHICLE_OPTIONS = [
  { id: 'Moto',      label: 'Moto',      icon: Bike },
  { id: 'Bicicleta', label: 'Bicicleta', icon: Bike },
  { id: 'Carro',     label: 'Carro',     icon: Car  },
  { id: 'A pé',      label: 'A pé',      icon: Users },
]

// ── Status do cadastro após envio ─────────────────────────────────────────────
function DriverStatusScreen({ driverId }: { driverId: string }) {
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['driver-status', driverId],
    queryFn: () => api.get<any>('/api/drivers/me'),
    refetchInterval: 10_000, // verifica a cada 10s
    refetchIntervalInBackground: false,
  })

  const driver = data as unknown as {
    id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
    vehicle?: string; deliveryFee?: number; city?: { name: string }
  }

  const STATUS_CONFIG = {
    PENDING: {
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: Clock,
      label: 'Aguardando aprovação',
      desc: 'Seu cadastro está sendo analisado pela prefeitura. Isso pode levar algumas horas.',
    },
    APPROVED: {
      color: GREEN,
      bg: GREEN_LIGHT,
      border: GREEN_BORDER,
      icon: CheckCircle,
      label: 'Aprovado! Pode começar',
      desc: 'Parabéns! Seu cadastro foi aprovado. Ative a disponibilidade na aba Entregas.',
    },
    REJECTED: {
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fee2e2',
      icon: XCircle,
      label: 'Cadastro não aprovado',
      desc: 'Infelizmente seu cadastro não foi aprovado desta vez. Entre em contato com a prefeitura.',
    },
    SUSPENDED: {
      color: '#6b7280',
      bg: '#f9fafb',
      border: '#e5e7eb',
      icon: XCircle,
      label: 'Conta suspensa',
      desc: 'Sua conta de entregador foi suspensa. Contate a prefeitura para mais informações.',
    },
  }

  const status = driver?.status ?? 'PENDING'
  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon

  const steps = [
    { key: 'sent',     label: 'Cadastro enviado',     done: true },
    { key: 'review',   label: 'Em análise',            done: status !== 'PENDING' },
    { key: 'approved', label: status === 'REJECTED' ? 'Não aprovado' : 'Aprovado', done: status === 'APPROVED' || status === 'REJECTED' },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.push('/(tabs)/perfil')}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status do cadastro</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={GREEN} />
            <Text style={{ marginTop: 10, color: '#9ca3af', fontSize: 13 }}>Verificando status...</Text>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: cfg.color + '20' }]}>
              <StatusIcon size={32} color={cfg.color} />
            </View>
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={styles.statusDesc}>{cfg.desc}</Text>
            {status === 'PENDING' && (
              <View style={styles.pollingRow}>
                <ActivityIndicator size="small" color={cfg.color} />
                <Text style={[styles.pollingText, { color: cfg.color }]}>Atualizando automaticamente...</Text>
              </View>
            )}
          </View>
        )}

        {/* Linha do tempo */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Progresso do cadastro</Text>
          <View style={styles.timeline}>
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1
              const isRejected = step.key === 'approved' && status === 'REJECTED'
              const dotColor = isRejected ? '#ef4444' : step.done ? GREEN : '#e5e7eb'
              const lineColor = steps[i + 1]?.done ? GREEN : '#e5e7eb'
              return (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
                      {step.done && !isRejected && <CheckCircle size={12} color="#fff" />}
                      {isRejected && <XCircle size={12} color="#fff" />}
                      {!step.done && <View style={styles.timelineDotEmpty} />}
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.timelineLabel,
                    step.done && { color: '#111827', fontWeight: '600' },
                    isRejected && { color: '#ef4444' },
                  ]}>
                    {step.label}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Info do cadastro */}
        {driver && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Dados do cadastro</Text>
            {driver.vehicle && (
              <View style={styles.infoRow}>
                <Bike size={15} color="#9ca3af" />
                <Text style={styles.infoKey}>Veículo</Text>
                <Text style={styles.infoVal}>{driver.vehicle}</Text>
              </View>
            )}
            {driver.deliveryFee !== undefined && (
              <View style={styles.infoRow}>
                <DollarSign size={15} color="#9ca3af" />
                <Text style={styles.infoKey}>Taxa por entrega</Text>
                <Text style={styles.infoVal}>R$ {Number(driver.deliveryFee).toFixed(2)}</Text>
              </View>
            )}
            {driver.city && (
              <View style={styles.infoRow}>
                <ClipboardList size={15} color="#9ca3af" />
                <Text style={styles.infoKey}>Cidade</Text>
                <Text style={styles.infoVal}>{driver.city.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Ação após aprovação */}
        {status === 'APPROVED' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/entregas')}>
            <Bike size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Ir para Entregas</Text>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Formulário de cadastro ────────────────────────────────────────────────────
export default function EntregadorCadastroScreen() {
  const router = useRouter()
  const { city } = useCityStore()
  const { loadSession } = useAuthStore()

  const [vehicle, setVehicle] = useState('')
  const [plate, setPlate] = useState('')
  const [fee, setFee] = useState('')
  const [loading, setLoading] = useState(false)
  const [driverId, setDriverId] = useState<string | null>(null)

  // Se já tem driverId, mostra a tela de status
  if (driverId) {
    return <DriverStatusScreen driverId={driverId} />
  }

  async function handleSubmit() {
    if (!vehicle) {
      Alert.alert('Atenção', 'Selecione o tipo de veículo.')
      return
    }
    const deliveryFee = parseFloat(fee.replace(',', '.'))
    if (isNaN(deliveryFee) || deliveryFee < 0) {
      Alert.alert('Atenção', 'Informe uma taxa de entrega válida (pode ser 0).')
      return
    }
    if (!city?.id) {
      Alert.alert('Erro', 'Cidade não identificada.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<any>('/api/drivers', {
        cityId: city.id,
        vehicle,
        vehiclePlate: plate.trim() || undefined,
        deliveryFee,
      })
      const driver = res as unknown as { id: string }
      await loadSession() // atualiza role no Zustand
      setDriverId(driver.id)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível concluir o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seja um entregador</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Bike size={36} color={GREEN} />
          </View>
          <Text style={styles.heroTitle}>Faça entregas e ganhe dinheiro</Text>
          <Text style={styles.heroDesc}>
            Seja seu próprio chefe. Escolha seus horários e ganhe por cada entrega realizada em{' '}
            {city?.name ?? 'sua cidade'}.
          </Text>
        </View>

        {/* Tipo de veículo */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Tipo de veículo <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.vehicleGrid}>
            {VEHICLE_OPTIONS.map(opt => {
              const Icon = opt.icon
              const isActive = vehicle === opt.id
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.vehicleCard, isActive && styles.vehicleCardActive]}
                  onPress={() => setVehicle(opt.id)}
                  activeOpacity={0.7}
                >
                  <Icon size={22} color={isActive ? GREEN : '#9ca3af'} />
                  <Text style={[styles.vehicleLabel, isActive && styles.vehicleLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Placa (só moto ou carro) */}
        {(vehicle === 'Moto' || vehicle === 'Carro') && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Placa do veículo{' '}
              <Text style={styles.optional}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: ABC-1234"
              value={plate}
              onChangeText={t => setPlate(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />
          </View>
        )}

        {/* Taxa de entrega */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Taxa por entrega (R$) <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.inputHint}>Pode ser R$ 0,00 se preferir negociar diretamente.</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputPrefix}>
              <DollarSign size={15} color="#9ca3af" />
              <Text style={styles.inputPrefixText}>R$</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="5,00"
              value={fee}
              onChangeText={setFee}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Como funciona */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <ClipboardList size={16} color="#2563eb" />
            <Text style={styles.infoTitle}>Como funciona</Text>
          </View>
          <Text style={styles.infoItem}>• Cadastro analisado pela prefeitura</Text>
          <Text style={styles.infoItem}>• Após aprovação você aceita entregas</Text>
          <Text style={styles.infoItem}>• Você escolhe quando está disponível</Text>
          <Text style={styles.infoItem}>• Confirmação com código único por entrega</Text>
        </View>

        {/* Botão */}
        <TouchableOpacity
          style={[styles.submitBtn, (loading || !vehicle || !fee) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !vehicle || !fee}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Bike size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Enviar cadastro</Text>
              </>
            )
          }
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Ao enviar, você concorda com os termos de uso e autoriza o uso das informações para análise.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backIcon: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  scroll: { padding: 16, gap: 16 },

  hero: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: GREEN_BORDER,
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  heroDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },

  section: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151' },
  required: { color: '#ef4444' },
  optional: { color: '#9ca3af', fontWeight: '400', fontSize: 12 },
  inputHint: { fontSize: 12, color: '#9ca3af', marginTop: -4 },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleCard: {
    flex: 1, minWidth: '40%', alignItems: 'center', gap: 8,
    padding: 16, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  vehicleCardActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  vehicleLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  vehicleLabelActive: { color: GREEN },

  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  inputFlex: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputPrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderRightWidth: 0,
  },
  inputPrefixText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },

  infoBox: {
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#bfdbfe', gap: 6,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  infoItem: { fontSize: 13, color: '#1e40af', lineHeight: 19 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  termsText: { fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 16 },

  // Status screen
  statusCard: {
    borderRadius: 20, padding: 24, gap: 10,
    alignItems: 'center', borderWidth: 1,
  },
  statusIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  statusLabel: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  statusDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  pollingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  pollingText: { fontSize: 12, fontWeight: '500' },

  timelineCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    gap: 16, borderWidth: 1, borderColor: '#f3f4f6',
  },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  timeline: { gap: 0 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 48 },
  timelineLeft: { alignItems: 'center', gap: 0, width: 28 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotEmpty: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d1d5db' },
  timelineLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  timelineLabel: { fontSize: 14, color: '#9ca3af', paddingTop: 5 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    gap: 12, borderWidth: 1, borderColor: '#f3f4f6',
  },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoKey: { fontSize: 13, color: '#9ca3af', flex: 1 },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#111827' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
})
