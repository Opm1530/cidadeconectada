import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, Phone, MapPin, LogOut, ChevronRight,
  Package, Tag, Wifi, WifiOff, CreditCard, Truck,
} from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const GREEN      = '#62a84a'
const GREEN_DARK = '#4a7e38'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

interface MyCompany {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  address: string | null
  category: string | null
  active: boolean
  acceptsPix: boolean
  acceptsCashOnDelivery: boolean
  acceptsMercadoPago: boolean
  pixKey: string | null
  hasOwnDelivery: boolean
  ownDeliveryFee: number | null
  acceptsPlatformDrivers: boolean
  _count: { orders: number; products: number }
}

export default function LojistaPerfil() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: company, isLoading } = useQuery<MyCompany>({
    queryKey: ['my-company'],
    queryFn: () => api.get('/api/companies/me'),
    staleTime: 60_000,
  })

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => api.patch('/api/companies/me', { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-company'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o status da loja.'),
  })

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/(auth)/login')
          },
        },
      ],
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    )
  }

  const isOpen = company?.active ?? false

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Cabeçalho da loja ─────────────────────────────────────── */}
        <View style={[styles.storeHeader, isOpen ? styles.storeHeaderOpen : styles.storeHeaderClosed]}>
          <View style={styles.storeIconWrap}>
            <Store size={32} color={isOpen ? GREEN : '#9ca3af'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{company?.name ?? '—'}</Text>
            <Text style={[styles.storeStatus, { color: isOpen ? GREEN : '#9ca3af' }]}>
              {isOpen ? '● Loja aberta' : '● Loja fechada'}
            </Text>
          </View>
        </View>

        {/* ── Toggle abrir / fechar ─────────────────────────────────── */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            {isOpen
              ? <Wifi size={20} color={GREEN} />
              : <WifiOff size={20} color='#9ca3af' />
            }
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toggleLabel}>
                {isOpen ? 'Loja aberta para pedidos' : 'Loja fechada'}
              </Text>
              <Text style={styles.toggleSub}>
                {isOpen ? 'Clientes podem fazer pedidos agora' : 'Clientes não veem sua loja no app'}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={(val) => toggleMutation.mutate(val)}
              trackColor={{ false: '#d1d5db', true: GREEN_BORDER }}
              thumbColor={isOpen ? GREEN : '#f3f4f6'}
              disabled={toggleMutation.isPending}
            />
          </View>
        </View>

        {/* ── Estatísticas ──────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Package size={20} color={GREEN} />
            <Text style={styles.statNum}>{company?._count.orders ?? 0}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
          <View style={styles.statCard}>
            <Tag size={20} color={GREEN} />
            <Text style={styles.statNum}>{company?._count.products ?? 0}</Text>
            <Text style={styles.statLabel}>Produtos</Text>
          </View>
        </View>

        {/* ── Informações da loja ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações da loja</Text>

          {company?.category && (
            <InfoRow icon={<Tag size={16} color="#6b7280" />} label="Categoria" value={company.category} />
          )}
          {company?.phone && (
            <InfoRow icon={<Phone size={16} color="#6b7280" />} label="Telefone" value={company.phone} />
          )}
          {company?.address && (
            <InfoRow icon={<MapPin size={16} color="#6b7280" />} label="Endereço" value={company.address} />
          )}
          {company?.description && (
            <InfoRow icon={<Store size={16} color="#6b7280" />} label="Descrição" value={company.description} />
          )}
        </View>

        {/* ── Pagamentos e entrega ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamentos e entrega</Text>

          <View style={styles.chipRow}>
            {company?.acceptsPix     && <Chip label="Pix" icon={<CreditCard size={12} color={GREEN} />} />}
            {company?.acceptsCashOnDelivery && <Chip label="Dinheiro" icon={<CreditCard size={12} color={GREEN} />} />}
            {company?.acceptsMercadoPago    && <Chip label="Mercado Pago" icon={<CreditCard size={12} color={GREEN} />} />}
          </View>

          <View style={styles.chipRow}>
            {company?.hasOwnDelivery && (
              <Chip
                label={`Entrega própria${company.ownDeliveryFee ? ` – R$ ${Number(company.ownDeliveryFee).toFixed(2)}` : ''}`}
                icon={<Truck size={12} color={GREEN} />}
              />
            )}
            {company?.acceptsPlatformDrivers && (
              <Chip label="Entregadores da plataforma" icon={<Truck size={12} color={GREEN} />} />
            )}
          </View>
        </View>

        {/* ── Conta ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{user?.name ?? '—'}</Text>
          </View>
          <View style={[styles.infoCard, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
          </View>
        </View>

        {/* ── Sair ──────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Cidade Conectada · Lojista</Text>

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconLabel}>
        {icon}
        <Text style={[styles.infoLabel, { marginLeft: 6 }]}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.chip}>
      {icon}
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:      { padding: 16, paddingBottom: 40 },

  // Header loja
  storeHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, marginBottom: 12 },
  storeHeaderOpen:   { backgroundColor: GREEN_LIGHT, borderWidth: 1, borderColor: GREEN_BORDER },
  storeHeaderClosed: { backgroundColor: '#f3f4f6',   borderWidth: 1, borderColor: '#e5e7eb'   },
  storeIconWrap:     { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  storeName:         { fontSize: 18, fontWeight: '700', color: '#111827' },
  storeStatus:       { fontSize: 13, fontWeight: '500', marginTop: 2 },

  // Toggle
  toggleCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  toggleRow:     { flexDirection: 'row', alignItems: 'center' },
  toggleLabel:   { fontSize: 15, fontWeight: '600', color: '#111827' },
  toggleSub:     { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Stats
  statsRow:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  statNum:   { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },

  // Section
  section:      { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  // Info rows
  infoCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoIconLabel: { flexDirection: 'row', alignItems: 'center' },
  infoLabel:     { fontSize: 14, color: '#6b7280' },
  infoValue:     { fontSize: 14, color: '#111827', fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 8 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN_LIGHT, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: GREEN_BORDER },
  chipText:{ fontSize: 12, color: GREEN, fontWeight: '500' },

  // Logout
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca', elevation: 1 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },

  version: { textAlign: 'center', fontSize: 12, color: '#d1d5db', marginTop: 4 },
})
