import {
  View, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, ActivityIndicator,
} from 'react-native'
import { Text } from '@/components/Text'
import { Image } from 'expo-image'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  LogOut, Package, Bike, ChevronRight, MapPin, Shield,
  Radio, Store, Heart, Camera,
} from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useCityStore } from '@/store/city'
import { apiClient } from '@/lib/api'

const GREEN        = '#62a84a'
const GREEN_LIGHT  = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

interface DriverInfo {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  active: boolean
  deliveryFee: number
  vehicle: string | null
}

export default function PerfilScreen() {
  const router       = useRouter()
  const queryClient  = useQueryClient()
  const { user, logout, setAvatarUrl } = useAuthStore()
  const { city } = useCityStore()
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const isDriver   = user?.role === 'DELIVERY_DRIVER'
  const isAdmin    = user?.role === 'CITY_ADMIN' || user?.role === 'SUPER_ADMIN'
  const isCustomer = user?.role === 'CUSTOMER' || !user?.role

  // Busca avatarUrl e dados frescos do banco
  const { data: meData } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.get<{ avatarUrl: string | null }>('/api/users/me'),
    enabled: !!user,
  })
  const avatarUrl = (meData as any)?.avatarUrl ?? user?.avatarUrl ?? null

  const { data: driverData } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => api.get<DriverInfo>('/api/drivers/me'),
    enabled: isDriver,
    refetchInterval: isDriver ? 30_000 : false,
  })
  const driver = driverData as unknown as DriverInfo | null

  const { mutate: toggleOnline, isPending: toggling } = useMutation({
    mutationFn: (active: boolean) => api.patch('/api/drivers/me', { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-me'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar seu status.'),
  })

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria para alterar a foto.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled) return

    const asset = result.assets[0]
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        name: 'avatar.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as any)
      formData.append('folder', 'avatars')

      const uploadRes = await apiClient.post<{ data: { url: string } }>(
        '/api/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      const url = uploadRes.data.data.url

      await api.patch('/api/users/me', { avatarUrl: url })
      setAvatarUrl(url)
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a foto.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await api.post('/api/auth/logout').catch(() => {})
          await logout()
          // cidade NÃO é limpa no logout — persiste para o próximo login
        },
      },
    ])
  }

  const isApprovedDriver = isDriver && driver?.status === 'APPROVED'
  const isOnline = driver?.active ?? false
  const initials = user?.name?.[0]?.toUpperCase() ?? '?'
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Foto de perfil */}
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.85}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            {/* Overlay de loading / edição */}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#fff" />
                : <Camera size={13} color="#fff" />
              }
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{user?.name ?? 'Usuário'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>

          {city && (
            <TouchableOpacity
              style={styles.cityRow}
              onPress={() => router.push('/selecionar-cidade')}
              activeOpacity={0.7}
            >
              <MapPin size={12} color={GREEN} />
              <Text style={styles.city}>{city.name}</Text>
              <Text style={styles.cityChange}>Alterar</Text>
            </TouchableOpacity>
          )}

          {isDriver && (
            <View style={[styles.roleBadge, isOnline && styles.roleBadgeOnline]}>
              <Radio size={11} color={isOnline ? '#fff' : GREEN} />
              <Text style={[styles.roleText, isOnline && { color: '#fff' }]}>
                {isOnline ? 'Online · Operando' : 'Entregador · Offline'}
              </Text>
            </View>
          )}
          {isAdmin && (
            <View style={[styles.roleBadge, styles.adminBadge]}>
              <Shield size={11} color="#2563eb" />
              <Text style={[styles.roleText, { color: '#2563eb' }]}>Administrador</Text>
            </View>
          )}
        </View>

        {/* ── Toggle online (só entregadores aprovados) ── */}
        {isApprovedDriver && (
          <View style={[styles.onlineCard, isOnline && styles.onlineCardActive]}>
            <View style={styles.onlineLeft}>
              <View style={[styles.onlineIcon, isOnline && styles.onlineIconActive]}>
                <Radio size={20} color={isOnline ? '#fff' : GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.onlineTitle, isOnline && styles.onlineTitleActive]}>
                  {isOnline ? 'Você está operando' : 'Começar a operar'}
                </Text>
                <Text style={styles.onlineSub}>
                  {isOnline ? 'Clientes podem te ver no checkout' : 'Ative para aparecer para os clientes'}
                </Text>
              </View>
            </View>
            <Switch
              value={isOnline}
              onValueChange={(val) => toggleOnline(val)}
              disabled={toggling}
              trackColor={{ false: '#e5e7eb', true: GREEN }}
              thumbColor="#fff"
            />
          </View>
        )}

        {/* ── Menu ── */}
        <View style={styles.menu}>
          <Text style={styles.menuSection}>Minha conta</Text>

          <TouchableOpacity style={styles.item} onPress={() => router.push('/(tabs)/pedidos')} activeOpacity={0.7}>
            <View style={styles.itemIcon}>
              <Package size={18} color={GREEN} />
            </View>
            <Text style={styles.itemText}>Meus Pedidos</Text>
            <ChevronRight size={16} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => router.push('/favoritos')} activeOpacity={0.7}>
            <View style={[styles.itemIcon, styles.itemIconFav]}>
              <Heart size={18} color="#ef4444" />
            </View>
            <Text style={styles.itemText}>Meus Favoritos</Text>
            <ChevronRight size={16} color="#d1d5db" />
          </TouchableOpacity>

          {/* Ganhe dinheiro — só para clientes */}
          {isCustomer && (
            <>
              <Text style={[styles.menuSection, { marginTop: 20 }]}>Ganhe dinheiro</Text>

              <TouchableOpacity
                style={[styles.item, styles.itemSeller]}
                onPress={() => router.push('/abrir-loja')}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIcon, styles.itemIconSeller]}>
                  <Store size={18} color="#f97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>Abrir minha loja</Text>
                  <Text style={styles.itemSub}>Venda seus produtos no app da cidade</Text>
                </View>
                <ChevronRight size={16} color="#f97316" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.item, styles.itemDriver]}
                onPress={() => router.push('/entregador/cadastro')}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIcon, styles.itemIconDriver]}>
                  <Bike size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>Quero ser entregador</Text>
                  <Text style={styles.itemSub}>Faça entregas e ganhe por cada pedido</Text>
                </View>
                <ChevronRight size={16} color={GREEN} />
              </TouchableOpacity>
            </>
          )}

          {isDriver && (
            <>
              <Text style={[styles.menuSection, { marginTop: 20 }]}>Entregador</Text>
              <TouchableOpacity
                style={styles.item}
                onPress={() => router.push('/(tabs)/entregas')}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIcon, styles.itemIconDriver]}>
                  <Bike size={18} color={GREEN} />
                </View>
                <Text style={styles.itemText}>Minhas entregas</Text>
                <ChevronRight size={16} color="#d1d5db" />
              </TouchableOpacity>
            </>
          )}

          {/* Sair */}
          <TouchableOpacity
            style={[styles.item, styles.itemLogout, { marginTop: 20 }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.itemIcon, styles.itemIconLogout]}>
              <LogOut size={18} color="#dc2626" />
            </View>
            <Text style={[styles.itemText, { color: '#dc2626' }]}>Sair</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24,
    gap: 6, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },

  // Avatar
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatarImg: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: GREEN_BORDER,
  },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 3, borderColor: GREEN_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 38, fontWeight: '800', color: GREEN },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GREEN,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

  name:  { fontSize: 20, fontWeight: '800', color: '#111827' },
  email: { fontSize: 13, color: '#9ca3af' },

  cityRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  city:       { fontSize: 12, color: GREEN, fontWeight: '600' },
  cityChange: { fontSize: 11, color: '#9ca3af', marginLeft: 2 },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GREEN_LIGHT, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: GREEN_BORDER, marginTop: 4,
  },
  roleBadgeOnline: { backgroundColor: GREEN, borderColor: '#3d6b2e' },
  adminBadge:      { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  roleText:        { fontSize: 12, fontWeight: '700', color: GREEN },

  // ── Toggle online ────────────────────────────────────────────────────────────
  onlineCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 16,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 2, borderColor: '#e5e7eb', gap: 12,
  },
  onlineCardActive:  { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  onlineLeft:        { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  onlineIcon:        { width: 44, height: 44, borderRadius: 12, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  onlineIconActive:  { backgroundColor: GREEN },
  onlineTitle:       { fontSize: 15, fontWeight: '700', color: '#374151' },
  onlineTitleActive: { color: '#3d6b2e' },
  onlineSub:         { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // ── Menu ─────────────────────────────────────────────────────────────────────
  menu:        { padding: 16, gap: 6 },
  menuSection: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 4, paddingHorizontal: 4,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6',
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  itemIconFav:    { backgroundColor: '#fff1f2' },
  itemIconDriver: { backgroundColor: GREEN_LIGHT },
  itemIconSeller: { backgroundColor: '#fff7ed' },
  itemIconLogout: { backgroundColor: '#fef2f2' },

  itemText:   { fontSize: 15, color: '#111827', fontWeight: '600', flex: 1 },
  itemSub:    { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  itemDriver: { borderColor: GREEN_BORDER, backgroundColor: GREEN_LIGHT },
  itemSeller: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  itemLogout: { borderColor: '#fee2e2', backgroundColor: '#fef2f2' },
})
