import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Calendar, Newspaper,
  Shield, Leaf, GraduationCap, Landmark, Globe, Syringe,
  Activity, ShoppingBag, Home,
} from 'lucide-react-native'
import { api } from '@/lib/api'

interface NewsDetail {
  id: string
  title: string
  summary: string | null
  content: string
  imageUrl: string | null
  category: string
  audience: string
  status: string
  publishedAt: string | null
  createdAt: string
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  GENERAL:        { label: 'Geral',           icon: Newspaper,    bg: '#f0f9ff', color: '#0284c7' },
  HEALTH:         { label: 'Saúde',           icon: Syringe,      bg: '#f0fdf4', color: '#16a34a' },
  SECURITY:       { label: 'Segurança',       icon: Shield,       bg: '#fff7ed', color: '#ea580c' },
  EVENTS:         { label: 'Eventos',         icon: Calendar,     bg: '#f0fdf4', color: '#62a84a' },
  INFRASTRUCTURE: { label: 'Infraestrutura',  icon: Home,         bg: '#fffbeb', color: '#d97706' },
  ECONOMY:        { label: 'Economia',        icon: ShoppingBag,  bg: '#f0fdf4', color: '#15803d' },
  ENVIRONMENT:    { label: 'Meio Ambiente',   icon: Leaf,         bg: '#f0fdf4', color: '#16a34a' },
  EDUCATION:      { label: 'Educação',        icon: GraduationCap, bg: '#eff6ff', color: '#2563eb' },
}

export default function NoticiaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['news', id],
    queryFn: () => api.get<NewsDetail>(`/api/news/${id}`),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#62a84a" size="large" />
      </SafeAreaView>
    )
  }

  const news = data as unknown as NewsDetail
  if (!news) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFound}>Notícia não encontrada</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const cfg = CATEGORY_CONFIG[news.category] ?? CATEGORY_CONFIG.GENERAL
  const Icon = cfg.icon

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button overlay */}
      <TouchableOpacity style={styles.backOverlay} onPress={() => router.back()}>
        <ArrowLeft size={20} color="#fff" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero image */}
        <View style={styles.hero}>
          {news.imageUrl ? (
            <Image source={{ uri: news.imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#4a7e38', '#62a84a']} style={StyleSheet.absoluteFillObject}>
              <View style={styles.heroIcon}>
                <Icon size={56} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
            style={[StyleSheet.absoluteFillObject, styles.heroGrad]}
          >
            <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
              <Icon size={12} color={cfg.color} />
              <Text style={[styles.categoryText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{news.title}</Text>

          {news.publishedAt && (
            <View style={styles.dateRow}>
              <Calendar size={13} color="#9ca3af" />
              <Text style={styles.date}>
                {new Date(news.publishedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
          )}

          {news.summary && (
            <Text style={styles.summary}>{news.summary}</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.body}>{news.content}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  notFound: { fontSize: 16, color: '#9ca3af' },

  backOverlay: {
    position: 'absolute', top: 52, left: 16,
    zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtn: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: '#c5e3bb',
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#62a84a' },

  hero: { height: 260, overflow: 'hidden', backgroundColor: '#1e1b4b' },
  heroIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroGrad: { justifyContent: 'flex-end', padding: 16 },

  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: { fontSize: 12, fontWeight: '700' },

  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30, letterSpacing: -0.3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 13, color: '#9ca3af' },
  summary: {
    fontSize: 15, color: '#374151', lineHeight: 22,
    fontStyle: 'italic', fontWeight: '500',
  },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  body: { fontSize: 15, color: '#374151', lineHeight: 24 },
})
