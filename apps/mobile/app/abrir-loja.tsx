import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput,
} from 'react-native'
import { Text } from '@/components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, Store, ChevronDown } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const GREEN = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

const CATEGORIES = [
  'Restaurante', 'Lanchonete', 'Pizzaria', 'Mercado', 'Farmácia', 'Padaria',
  'Açaí', 'Sushi', 'Bebidas', 'Doceria', 'Petshop', 'Serviços',
  'Moda', 'Eletrônicos', 'Hortifruti', 'Papelaria', 'Brinquedos',
]

interface City { id: string; name: string; state: string }

export default function AbrirLojaScreen() {
  const router = useRouter()
  const { logout } = useAuthStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [category, setCategory] = useState('')
  const [cityId, setCityId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showCities, setShowCities] = useState(false)

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<City[]>('/api/cities'),
    staleTime: Infinity,
  })
  const cities: City[] = (citiesData as unknown as City[]) ?? []

  async function handleSubmit() {
    if (!name.trim() || name.length < 2) {
      Alert.alert('Atenção', 'Digite o nome da sua loja (mínimo 2 caracteres).')
      return
    }
    if (!cityId) {
      Alert.alert('Atenção', 'Selecione a cidade da sua loja.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/companies', {
        name: name.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        address: address.trim() || undefined,
        category: category || undefined,
        cityId,
      })

      // Tokens foram invalidados no servidor — precisa fazer login novamente
      await logout()

      Alert.alert(
        '🎉 Loja criada com sucesso!',
        'Para acessar o painel de vendedor, faça login novamente com seu e-mail e senha.',
        [{ text: 'Fazer login', onPress: () => router.replace('/(auth)/login') }],
        { cancelable: false },
      )
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar sua loja. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const selectedCity = cities.find(c => c.id === cityId)

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Abrir minha loja</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Store size={36} color={GREEN} />
          </View>
          <Text style={s.heroTitle}>Comece a vender hoje</Text>
          <Text style={s.heroSub}>
            Crie sua loja em minutos e alcance clientes da sua cidade pelo app
          </Text>
        </View>

        {/* Formulário */}
        <View style={s.form}>
          <Field label="Nome da loja *">
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Açaí do João"
              placeholderTextColor="#9ca3af"
            />
          </Field>

          <Field label="Cidade *">
            <TouchableOpacity
              style={s.picker}
              onPress={() => setShowCities(!showCities)}
              activeOpacity={0.8}
            >
              <Text style={cityId ? s.pickerValue : s.pickerPlaceholder}>
                {selectedCity ? `${selectedCity.name} — ${selectedCity.state}` : 'Selecione a cidade'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" />
            </TouchableOpacity>
            {showCities && (
              <View style={s.dropdown}>
                {cities.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.dropdownItem, c.id === cityId && s.dropdownItemActive]}
                    onPress={() => { setCityId(c.id); setShowCities(false) }}
                  >
                    <Text style={[s.dropdownText, c.id === cityId && s.dropdownTextActive]}>
                      {c.name} — {c.state}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Field>

          <Field label="Categoria">
            <TouchableOpacity
              style={s.picker}
              onPress={() => setShowCategories(!showCategories)}
              activeOpacity={0.8}
            >
              <Text style={category ? s.pickerValue : s.pickerPlaceholder}>
                {category || 'Selecione (opcional)'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" />
            </TouchableOpacity>
            {showCategories && (
              <View style={s.dropdown}>
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
            <TextInput
              style={[s.input, s.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva sua loja brevemente..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Telefone">
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(11) 9999-9999"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="WhatsApp">
                <TextInput
                  style={s.input}
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  placeholder="11999999999"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Endereço">
            <TextInput
              style={s.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Rua, número, bairro..."
              placeholderTextColor="#9ca3af"
            />
          </Field>
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            💡 Após criar sua loja, configure pagamentos, entrega e adicione seus produtos nas configurações.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitText}>Criar minha loja</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },

  scroll: { flex: 1 },
  content: { padding: 20 },

  hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: GREEN_LIGHT, borderWidth: 1, borderColor: GREEN_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  heroSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  form: { gap: 12, marginBottom: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  row: { flexDirection: 'row', gap: 12 },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fafafa',
  },
  textarea: { height: 80, paddingTop: 12 },

  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  pickerValue: { fontSize: 14, color: '#111827', flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: '#9ca3af', flex: 1 },

  dropdown: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    backgroundColor: '#fff', overflow: 'hidden', marginTop: 4,
    maxHeight: 220,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownText: { fontSize: 14, color: '#374151' },
  dropdownTextActive: { color: GREEN, fontWeight: '700' },

  infoBox: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 19 },

  submitBtn: {
    backgroundColor: GREEN, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: GREEN, shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})
