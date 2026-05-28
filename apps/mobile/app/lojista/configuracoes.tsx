import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Switch, Image,
} from 'react-native'
import { Text } from '@/components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Store, Phone, MapPin, CreditCard, Truck,
  QrCode, Wallet, ChevronDown, Save, ImagePlus, X, Clock,
} from 'lucide-react-native'
import { api } from '@/lib/api'
import { useImageUpload } from '@/hooks/useImageUpload'

const GREEN       = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'
const ORANGE      = '#f97316'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const DEFAULT_DAY = { enabled: false, open: '08:00', close: '18:00' }

interface DayHours { enabled: boolean; open: string; close: string }

const CATEGORIES = [
  'Restaurante', 'Lanchonete', 'Pizzaria', 'Mercado', 'Farmácia', 'Padaria',
  'Açaí', 'Sushi', 'Bebidas', 'Doceria', 'Petshop', 'Serviços',
  'Moda', 'Eletrônicos', 'Hortifruti', 'Papelaria', 'Brinquedos',
]

interface MyCompany {
  id: string; name: string; description: string | null
  phone: string | null; whatsapp: string | null; address: string | null
  category: string | null; logoUrl: string | null; coverUrl: string | null
  acceptsPix: boolean; pixKey: string | null
  acceptsCashOnDelivery: boolean
  acceptsMercadoPago: boolean; mercadoPagoToken: string | null
  hasOwnDelivery: boolean; ownDeliveryFee: number | null
  acceptsPlatformDrivers: boolean
  openingHours: Record<string, DayHours> | null
}

export default function ConfiguracoesScreen() {
  const queryClient = useQueryClient()

  const { data: companyData, isLoading } = useQuery<MyCompany>({
    queryKey: ['my-company'],
    queryFn: () => api.get('/api/companies/me'),
    staleTime: 60_000,
  })
  const company = companyData as unknown as MyCompany

  // Estado local para edição
  const [name, setName]           = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone]         = useState('')
  const [whatsapp, setWhatsapp]   = useState('')
  const [address, setAddress]     = useState('')
  const [category, setCategory]   = useState('')
  const [logoUrl, setLogoUrl]     = useState('')
  const [coverUrl, setCoverUrl]   = useState('')

  const [acceptsPix, setAcceptsPix]   = useState(false)
  const [pixKey, setPixKey]           = useState('')
  const [acceptsCash, setAcceptsCash] = useState(false)
  const [acceptsMP, setAcceptsMP]     = useState(false)
  const [mpToken, setMpToken]         = useState('')

  const [hasOwnDelivery, setHasOwnDelivery]   = useState(false)
  const [deliveryFee, setDeliveryFee]         = useState('')
  const [acceptsDrivers, setAcceptsDrivers]   = useState(false)

  const [showCategories, setShowCategories]   = useState(false)

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>({})

  const { pickAndUpload, uploading: imageUploading } = useImageUpload()

  function updateDayHours(day: string, field: 'enabled' | 'open' | 'close', value: boolean | string) {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...(prev[day] ?? DEFAULT_DAY), [field]: value },
    }))
  }

  // Preenche estado quando empresa carrega
  useEffect(() => {
    if (!company) return
    setName(company.name ?? '')
    setDescription(company.description ?? '')
    setPhone(company.phone ?? '')
    setWhatsapp(company.whatsapp ?? '')
    setAddress(company.address ?? '')
    setCategory(company.category ?? '')
    setLogoUrl(company.logoUrl ?? '')
    setCoverUrl(company.coverUrl ?? '')
    setAcceptsPix(company.acceptsPix ?? false)
    setPixKey(company.pixKey ?? '')
    setAcceptsCash(company.acceptsCashOnDelivery ?? false)
    setAcceptsMP(company.acceptsMercadoPago ?? false)
    setMpToken(company.mercadoPagoToken ?? '')
    setHasOwnDelivery(company.hasOwnDelivery ?? false)
    setDeliveryFee(company.ownDeliveryFee ? String(company.ownDeliveryFee) : '')
    setAcceptsDrivers(company.acceptsPlatformDrivers ?? false)
    setOpeningHours((company.openingHours as Record<string, DayHours>) ?? {})
  }, [company])

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch('/api/companies/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-company'] })
      Alert.alert('Sucesso', 'Configurações salvas!')
    },
    onError: (err: any) => {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar as configurações.')
    },
  })

  function handleSave() {
    if (!name.trim() || name.length < 2) {
      Alert.alert('Atenção', 'O nome da loja é obrigatório.')
      return
    }
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      address: address.trim() || null,
      category: category || null,
      logoUrl: logoUrl.trim() || null,
      coverUrl: coverUrl.trim() || null,
      acceptsPix,
      pixKey: acceptsPix ? (pixKey.trim() || null) : null,
      acceptsCashOnDelivery: acceptsCash,
      acceptsMercadoPago: acceptsMP,
      mercadoPagoToken: acceptsMP ? (mpToken.trim() || null) : null,
      hasOwnDelivery,
      ownDeliveryFee: hasOwnDelivery ? (parseFloat(deliveryFee.replace(',', '.')) || 0) : null,
      acceptsPlatformDrivers: acceptsDrivers,
      openingHours,
    })
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
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Configurações</Text>
        <TouchableOpacity
          style={[s.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Save size={14} color="#fff" />
                <Text style={s.saveBtnText}>Salvar</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Info da loja ── */}
        <Section icon={<Store size={16} color={GREEN} />} title="Informações da loja">
          <Field label="Nome *">
            <TextInput style={s.input} value={name} onChangeText={setName}
              placeholder="Nome da loja" placeholderTextColor="#9ca3af" />
          </Field>

          <Field label="Categoria">
            <TouchableOpacity style={s.picker} onPress={() => setShowCategories(!showCategories)} activeOpacity={0.8}>
              <Text style={category ? s.pickerValue : s.pickerPlaceholder}>
                {category || 'Selecione'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" />
            </TouchableOpacity>
            {showCategories && (
              <View style={s.dropdown}>
                <TouchableOpacity
                  style={s.dropdownItem}
                  onPress={() => { setCategory(''); setShowCategories(false) }}
                >
                  <Text style={s.dropdownText}>— Sem categoria —</Text>
                </TouchableOpacity>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.dropdownItem, c === category && s.dropdownItemActive]}
                    onPress={() => { setCategory(c); setShowCategories(false) }}
                  >
                    <Text style={[s.dropdownText, c === category && s.dropdownTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Field>

          <Field label="Descrição">
            <TextInput style={[s.input, s.textarea]} value={description} onChangeText={setDescription}
              placeholder="Descreva sua loja..." placeholderTextColor="#9ca3af"
              multiline numberOfLines={3} textAlignVertical="top" />
          </Field>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Telefone">
                <TextInput style={s.input} value={phone} onChangeText={setPhone}
                  placeholder="(11) 9999-9999" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="WhatsApp">
                <TextInput style={s.input} value={whatsapp} onChangeText={setWhatsapp}
                  placeholder="11999999999" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
              </Field>
            </View>
          </View>

          <Field label="Endereço">
            <TextInput style={s.input} value={address} onChangeText={setAddress}
              placeholder="Rua, número, bairro..." placeholderTextColor="#9ca3af" />
          </Field>
        </Section>

        {/* ── Imagens ── */}
        <Section icon={<MapPin size={16} color={GREEN} />} title="Logo e banner">
          <Field label="Logo da loja">
            <ImageUploadField
              url={logoUrl}
              onUrl={setLogoUrl}
              folder="logos"
              aspect={[1, 1]}
              placeholder="Logo quadrada (1:1)"
              uploading={imageUploading}
              onPick={pickAndUpload}
              previewSize={80}
            />
          </Field>
          <Field label="Banner / Capa">
            <ImageUploadField
              url={coverUrl}
              onUrl={setCoverUrl}
              folder="covers"
              aspect={[16, 9]}
              placeholder="Banner largo (16:9)"
              uploading={imageUploading}
              onPick={pickAndUpload}
              previewSize={120}
              previewAspect={16 / 9}
            />
          </Field>
        </Section>

        {/* ── Pagamentos ── */}
        <Section icon={<CreditCard size={16} color={GREEN} />} title="Formas de pagamento">
          {/* Pix */}
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <QrCode size={18} color="#7c3aed" />
              <View>
                <Text style={s.toggleLabel}>Aceitar Pix</Text>
              </View>
            </View>
            <Switch value={acceptsPix} onValueChange={setAcceptsPix}
              trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }} thumbColor={acceptsPix ? GREEN : '#f3f4f6'} />
          </View>
          {acceptsPix && (
            <Field label="Chave Pix">
              <TextInput style={s.input} value={pixKey} onChangeText={setPixKey}
                placeholder="CPF, CNPJ, e-mail ou telefone" placeholderTextColor="#9ca3af" />
            </Field>
          )}

          {/* Dinheiro */}
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Wallet size={18} color="#059669" />
              <Text style={s.toggleLabel}>Dinheiro na entrega</Text>
            </View>
            <Switch value={acceptsCash} onValueChange={setAcceptsCash}
              trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }} thumbColor={acceptsCash ? GREEN : '#f3f4f6'} />
          </View>

          {/* Mercado Pago */}
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <CreditCard size={18} color="#009ee3" />
              <Text style={s.toggleLabel}>Mercado Pago</Text>
            </View>
            <Switch value={acceptsMP} onValueChange={setAcceptsMP}
              trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }} thumbColor={acceptsMP ? GREEN : '#f3f4f6'} />
          </View>
          {acceptsMP && (
            <Field label="Access Token do Mercado Pago">
              <TextInput style={s.input} value={mpToken} onChangeText={setMpToken}
                placeholder="APP_USR-..." placeholderTextColor="#9ca3af"
                autoCapitalize="none" secureTextEntry />
              <Text style={s.hint}>Mercado Pago → Suas Integrações → Credenciais</Text>
            </Field>
          )}
        </Section>

        {/* ── Entrega ── */}
        <Section icon={<Truck size={16} color={GREEN} />} title="Entrega">
          {/* Própria */}
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Truck size={18} color={ORANGE} />
              <View>
                <Text style={s.toggleLabel}>Entrega própria</Text>
                <Text style={s.toggleSub}>Você mesmo faz as entregas</Text>
              </View>
            </View>
            <Switch value={hasOwnDelivery} onValueChange={setHasOwnDelivery}
              trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }} thumbColor={hasOwnDelivery ? GREEN : '#f3f4f6'} />
          </View>
          {hasOwnDelivery && (
            <Field label="Taxa de entrega (R$)">
              <TextInput style={[s.input, { width: 140 }]} value={deliveryFee} onChangeText={setDeliveryFee}
                placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" />
            </Field>
          )}

          {/* Plataforma */}
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Truck size={18} color={GREEN} />
              <View>
                <Text style={s.toggleLabel}>Entregadores da plataforma</Text>
                <Text style={s.toggleSub}>Clientes escolhem um entregador</Text>
              </View>
            </View>
            <Switch value={acceptsDrivers} onValueChange={setAcceptsDrivers}
              trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }} thumbColor={acceptsDrivers ? GREEN : '#f3f4f6'} />
          </View>
        </Section>

        {/* ── Horários de funcionamento ── */}
        <Section icon={<Clock size={16} color={GREEN} />} title="Horários de funcionamento">
          <Text style={s.hint}>
            A loja fecha automaticamente no horário definido. Você ainda precisa abrir manualmente na aba Pedidos.
          </Text>
          {DAY_NAMES.map((dayName, idx) => {
            const key = String(idx)
            const day: DayHours = openingHours[key] ?? DEFAULT_DAY
            return (
              <View key={key} style={s.dayRow}>
                <View style={s.dayLeft}>
                  <Text style={[s.dayName, day.enabled && s.dayNameActive]}>{dayName}</Text>
                  {!day.enabled && <Text style={s.dayClosed}>Fechado</Text>}
                </View>

                {day.enabled && (
                  <View style={s.dayTimes}>
                    <TextInput
                      style={s.timeInput}
                      value={day.open}
                      onChangeText={v => updateDayHours(key, 'open', v)}
                      placeholder="08:00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={s.timeSep}>–</Text>
                    <TextInput
                      style={s.timeInput}
                      value={day.close}
                      onChangeText={v => updateDayHours(key, 'close', v)}
                      placeholder="18:00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                )}

                <Switch
                  value={day.enabled}
                  onValueChange={v => updateDayHours(key, 'enabled', v)}
                  trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }}
                  thumbColor={day.enabled ? GREEN : '#f3f4f6'}
                />
              </View>
            )
          })}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

interface ImageUploadFieldProps {
  url: string
  onUrl: (url: string) => void
  folder: string
  aspect: [number, number]
  placeholder: string
  uploading: boolean
  onPick: (opts: { folder: string; aspect: [number, number] }) => Promise<string | null>
  previewSize?: number
  previewAspect?: number
}

function ImageUploadField({
  url, onUrl, folder, aspect, placeholder,
  uploading, onPick, previewSize = 100, previewAspect = 1,
}: ImageUploadFieldProps) {
  const previewW = previewSize * (previewAspect > 1 ? previewAspect : 1)
  const previewH = previewAspect > 1 ? previewSize : previewSize

  return (
    <View style={{ gap: 8 }}>
      {url ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: url }}
              style={{ width: previewW, height: previewH, borderRadius: 10 }}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={s.imgRemoveBtn}
              onPress={() => onUrl('')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <X size={12} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.imgChangeBtn, uploading && { opacity: 0.6 }]}
            onPress={async () => {
              const result = await onPick({ folder, aspect })
              if (result) onUrl(result)
            }}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {uploading
              ? <ActivityIndicator color={GREEN} size="small" />
              : <ImagePlus size={14} color={GREEN} />
            }
            <Text style={s.imgChangeBtnText}>{uploading ? 'Enviando...' : 'Trocar'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.imgPickerBtn, uploading && { opacity: 0.6 }]}
          onPress={async () => {
            const result = await onPick({ folder, aspect })
            if (result) onUrl(result)
          }}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading
            ? <ActivityIndicator color={GREEN} size="small" />
            : <ImagePlus size={22} color={GREEN} />
          }
          <Text style={s.imgPickerText}>{uploading ? 'Enviando...' : placeholder}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        {icon}
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  row: { flexDirection: 'row', gap: 12 },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fafafa',
  },
  textarea: { height: 80, paddingTop: 12 },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: -4 },

  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa',
  },
  pickerValue: { fontSize: 14, color: '#111827', flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: '#9ca3af', flex: 1 },

  dropdown: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    backgroundColor: '#fff', overflow: 'hidden', marginTop: 4, maxHeight: 220,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownText: { fontSize: 14, color: '#374151' },
  dropdownTextActive: { color: GREEN, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  // Opening hours
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  dayLeft: { width: 44, gap: 2 },
  dayName: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  dayNameActive: { color: '#111827' },
  dayClosed: { fontSize: 11, color: '#d1d5db', fontWeight: '500' },
  dayTimes: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, fontWeight: '600', color: '#111827',
    backgroundColor: '#fafafa', width: 60, textAlign: 'center',
  },
  timeSep: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },

  // Image upload
  imgPickerBtn: {
    borderWidth: 1.5, borderColor: GREEN, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN_LIGHT,
  },
  imgPickerText: { fontSize: 13, fontWeight: '600', color: GREEN },
  imgRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  imgChangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: GREEN, borderRadius: 8,
    backgroundColor: GREEN_LIGHT, alignSelf: 'flex-start',
  },
  imgChangeBtnText: { fontSize: 12, fontWeight: '600', color: GREEN },
})
