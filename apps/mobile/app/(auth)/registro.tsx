import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { User, Mail, Phone, Lock, ArrowLeft } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import * as SecureStore from 'expo-secure-store'

const GREEN = '#62a84a'

export default function RegistroScreen() {
  const router = useRouter()
  const { loadSession } = useAuthStore()
  const [form, setForm]   = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }))
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Atenção', 'Preencha nome, e-mail e senha.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        '/api/auth/register',
        { ...form, role: 'CUSTOMER' },
      )
      const { accessToken, refreshToken } = res as unknown as { accessToken: string; refreshToken: string }
      await SecureStore.setItemAsync('cc_access', accessToken)
      await SecureStore.setItemAsync('cc_refresh', refreshToken)
      await loadSession()
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.root}>
      {/* Fundo verde */}
      <LinearGradient
        colors={['#72c45a', GREEN, '#3d7a2e']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={s.flex}>

          {/* Topo verde com voltar e título */}
          <View style={s.top}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <ArrowLeft size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <Text style={s.topTitle}>Criar conta</Text>
            <Text style={s.topSub}>É rápido e gratuito</Text>
          </View>

          {/* Card branco com o formulário */}
          <ScrollView
            style={s.sheet}
            contentContainerStyle={s.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field
              icon={<User size={17} color="#9ca3af" />}
              placeholder="Nome completo"
              value={form.name}
              onChangeText={set('name')}
              autoCapitalize="words"
            />
            <Field
              icon={<Mail size={17} color="#9ca3af" />}
              placeholder="E-mail"
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon={<Phone size={17} color="#9ca3af" />}
              placeholder="Telefone (opcional)"
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
            />
            <Field
              icon={<Lock size={17} color="#9ca3af" />}
              placeholder="Senha (mín. 6 caracteres)"
              value={form.password}
              onChangeText={set('password')}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Criar conta</Text>
              }
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginText}>Já tem conta? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={s.loginLink}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ── Campo reutilizável ────────────────────────────────────────────────────────

function Field({ icon, ...props }: { icon: React.ReactNode } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={s.field}>
      {icon}
      <TextInput style={s.fieldInput} placeholderTextColor="#9ca3af" {...props} />
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  top: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34, gap: 6 },
  backBtn: { marginBottom: 8, alignSelf: 'flex-start' },
  topTitle: { fontSize: 27, fontWeight: '900', color: '#fff' },
  topSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  sheet: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 34, borderTopRightRadius: 34,
  },
  sheetContent: { padding: 24, gap: 14, paddingBottom: 48 },

  field: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f5f5f5', borderRadius: 14,
    paddingHorizontal: 16, height: 54,
  },
  fieldInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },

  btn: {
    height: 54, borderRadius: 14, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { fontSize: 14, color: GREEN, fontWeight: '700' },
})
