import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native'
import { Image } from 'expo-image'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { OnboardingImages } from '@/lib/images'
import * as SecureStore from 'expo-secure-store'

const { width: SW } = Dimensions.get('window')
const GREEN         = '#62a84a'
const GREEN_DARK    = '#3d7a2e'
const YELLOW        = '#f5c518'
const YELLOW_DARK   = '#e6a800'

// ── Slides de onboarding ──────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'food',
    colors: ['#72c45a', GREEN, GREEN_DARK] as [string, string, string],
    image: OnboardingImages.slide1,
    title: 'O app que leva seus\n',
    titleAccent: 'favoritos até você.',
    sub: 'Peça nos melhores restaurantes e lojas da sua cidade.',
  },
  {
    key: 'city',
    colors: ['#72c45a', GREEN, GREEN_DARK] as [string, string, string],
    image: OnboardingImages.slide2,
    title: 'Sua cidade em\n',
    titleAccent: 'um só lugar.',
    sub: 'Notícias, enquetes e serviços da prefeitura na palma da mão.',
  },
  {
    key: 'happy',
    colors: [YELLOW, YELLOW_DARK, '#c47f00'] as [string, string, string],
    image: OnboardingImages.slide3,
    title: 'Levar felicidade\ncom ',
    titleAccent: 'comida deliciosa\né nossa meta.',
    sub: '',
  },
]


// ── Componente principal ──────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter()
  const { loadSession } = useAuthStore()

  const [mode, setMode]         = useState<'onboarding' | 'login'>('onboarding')
  const [slideIdx, setSlideIdx] = useState(0)
  const scrollRef               = useRef<ScrollView>(null)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const slide = SLIDES[slideIdx]

  function nextSlide() {
    if (slideIdx < SLIDES.length - 1) {
      const next = slideIdx + 1
      scrollRef.current?.scrollTo({ x: next * SW, animated: true })
      setSlideIdx(next)
    } else {
      setMode('login')
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha')
      return
    }
    setLoading(true)
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string }>(
        '/api/auth/login',
        { email, password },
      )
      const { accessToken, refreshToken } = data as unknown as {
        accessToken: string; refreshToken: string
      }
      await SecureStore.setItemAsync('cc_access', accessToken)
      await SecureStore.setItemAsync('cc_refresh', refreshToken)
      await loadSession()
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  // ── Onboarding ───────────────────────────────────────────────────────────────
  if (mode === 'onboarding') {
    return (
      <View style={s.root}>
        {/* Fundo do slide atual */}
        <LinearGradient
          colors={slide.colors}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />


        <SafeAreaView style={s.onboard}>

          {/* Slides horizontais */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            onMomentumScrollEnd={e =>
              setSlideIdx(Math.round(e.nativeEvent.contentOffset.x / SW))
            }
          >
            {SLIDES.map(sl => (
              <View key={sl.key} style={{ width: SW, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={sl.image} style={s.heroImg} contentFit="cover" />
              </View>
            ))}
          </ScrollView>

          {/* Texto do slide atual */}
          <View style={s.onboardBody}>
            <Text style={s.onboardTitle}>
              {slide.title}
              <Text style={s.onboardAccent}>{slide.titleAccent}</Text>
            </Text>
            {!!slide.sub && (
              <Text style={s.onboardSub}>{slide.sub}</Text>
            )}
          </View>

          {/* Dots */}
          <View style={s.dotsRow}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === slideIdx && s.dotActive]} />
            ))}
          </View>

          {/* Botões — último slide mostra "Começar" */}
          {slideIdx < SLIDES.length - 1 ? (
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.btnSkip}
                onPress={() => setMode('login')}
              >
                <Text style={s.btnSkipText}>Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnNext} onPress={nextSlide}>
                <Text style={s.btnNextText}>Próximo →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnOutline} onPress={() => setMode('login')}>
                <Text style={s.btnOutlineText}>Entrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnDark} onPress={() => router.push('/(auth)/registro')}>
                <Text style={s.btnDarkText}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          )}

        </SafeAreaView>
      </View>
    )
  }

  // ── Formulário de login ───────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Fundo verde */}
      <LinearGradient
        colors={['#72c45a', GREEN, GREEN_DARK]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />


      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={s.flex}>

          {/* Topo verde */}
          <View style={s.formTop}>
            <TouchableOpacity onPress={() => setMode('onboarding')}>
              <Text style={s.back}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={s.formWelcome}>Bem-vindo de volta!</Text>
            <Text style={s.formWelcomeSub}>Entre na sua conta para continuar</Text>
          </View>

          {/* Card branco */}
          <View style={s.sheet}>
            <View style={s.field}>
              <Mail size={17} color="#9ca3af" />
              <TextInput
                style={s.fieldInput}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Lock size={17} color="#9ca3af" />
              <TextInput
                style={s.fieldInput}
                placeholder="Senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                {showPass
                  ? <EyeOff size={17} color="#9ca3af" />
                  : <Eye size={17} color="#9ca3af" />
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.loginBtnText}>Entrar</Text>
              }
            </TouchableOpacity>

            <View style={s.regRow}>
              <Text style={s.regText}>Não tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/registro')}>
                <Text style={s.regLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bgEmoji: { position: 'absolute' },

  // ── Onboarding
  onboard: { flex: 1, paddingHorizontal: 28, paddingBottom: 52 },

  heroImg: { width: 280, height: 280 },

  onboardBody: { marginBottom: 26 },
  onboardTitle: {
    fontSize: 34, fontWeight: '900', color: '#fff',
    lineHeight: 40, letterSpacing: -0.5, marginBottom: 10,
  },
  onboardAccent: { color: 'rgba(255,255,255,0.65)' },
  onboardSub: { fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 21 },

  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 26 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 22, backgroundColor: '#fff', borderRadius: 3 },

  btnRow: { flexDirection: 'row', gap: 12 },
  btnSkip: {
    flex: 1, height: 54, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnSkipText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '700' },
  btnNext: {
    flex: 2, height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnNextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: {
    flex: 1, height: 54, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDark: {
    flex: 1, height: 54, borderRadius: 16,
    backgroundColor: '#1c1c1e',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDarkText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Login form
  formTop: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 38, gap: 6 },
  back: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600' },
  formWelcome: { fontSize: 27, fontWeight: '900', color: '#fff', marginTop: 10 },
  formWelcomeSub: { fontSize: 14, color: 'rgba(255,255,255,0.68)' },

  sheet: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 34, borderTopRightRadius: 34,
    paddingHorizontal: 24, paddingTop: 34, gap: 14,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f5f5f5', borderRadius: 14,
    paddingHorizontal: 16, height: 54,
  },
  fieldInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },

  loginBtn: {
    height: 54, borderRadius: 14, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  regRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  regText: { fontSize: 14, color: '#6b7280' },
  regLink: { fontSize: 14, color: GREEN, fontWeight: '700' },
})
