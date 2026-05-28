import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Dimensions, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  Newspaper, BarChart3, Calendar, Shield, Leaf, GraduationCap,
  Landmark, Globe, Syringe, ChevronRight, AtSign, Share2,
  Phone, MapPin, Users, Clock, ArrowRight,
} from 'lucide-react-native'
import { api } from '@/lib/api'
import { useCityStore } from '@/store/city'

const { width: SW } = Dimensions.get('window')
const GREEN = '#62a84a'
const GREEN_DARK = '#4a7e38'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'

// ── Interfaces ────────────────────────────────────────────────────────────────
interface CityDetail {
  id: string; name: string; state: string; slug: string
  footerAbout: string | null
  footerPhone: string | null; footerEmail: string | null
  footerAddress: string | null; footerInstagram: string | null
  footerFacebook: string | null; footerWhatsapp: string | null
}
interface NewsItem {
  id: string; title: string; summary: string | null
  imageUrl: string | null; category: string; publishedAt: string | null
}
interface Poll {
  id: string; title: string; description: string | null
  endsAt: string | null; status: string
  _count: { responses: number }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  GENERAL:        { label: 'Geral',          icon: Newspaper,     bg: '#f0f9ff', color: '#0284c7' },
  HEALTH:         { label: 'Saúde',          icon: Syringe,       bg: '#f0fdf4', color: '#16a34a' },
  SECURITY:       { label: 'Segurança',      icon: Shield,        bg: '#fff7ed', color: '#ea580c' },
  EVENTS:         { label: 'Eventos',        icon: Calendar,      bg: '#fdf4ff', color: '#9333ea' },
  INFRASTRUCTURE: { label: 'Infraestrutura', icon: Landmark,      bg: '#fffbeb', color: '#d97706' },
  ECONOMY:        { label: 'Economia',       icon: Globe,         bg: '#f0fdf4', color: '#15803d' },
  ENVIRONMENT:    { label: 'Meio Ambiente',  icon: Leaf,          bg: '#f0fdf4', color: '#16a34a' },
  EDUCATION:      { label: 'Educação',       icon: GraduationCap, bg: '#eff6ff', color: '#2563eb' },
}

function timeAgo(date: string | null): string {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m atrás`
  if (hours < 24) return `${hours}h atrás`
  if (days < 7)   return `${days}d atrás`
  return new Date(date).toLocaleDateString('pt-BR')
}

// ── Perfil da cidade (header) ─────────────────────────────────────────────────
function CityProfile({
  city, detail, bannerUrl, newsCount, pollsCount,
}: {
  city: { name: string; state: string; slug: string }
  detail: CityDetail | null
  bannerUrl: string | null
  newsCount: number
  pollsCount: number
}) {
  return (
    <View style={prof.wrapper}>
      {/* Cover */}
      <View style={prof.cover}>
        {bannerUrl
          ? <Image source={{ uri: bannerUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          : <LinearGradient colors={[GREEN_DARK, GREEN]} style={StyleSheet.absoluteFillObject} />
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Avatar sobreposto */}
      <View style={prof.avatarWrap}>
        <LinearGradient colors={[GREEN_DARK, GREEN]} style={prof.avatar}>
          <Text style={prof.avatarText}>{city.name[0].toUpperCase()}</Text>
        </LinearGradient>
      </View>

      {/* Info */}
      <View style={prof.info}>
        <Text style={prof.cityName}>Prefeitura de {city.name}</Text>
        <View style={prof.locationRow}>
          <MapPin size={12} color="#9ca3af" />
          <Text style={prof.locationText}>{city.name}, {city.state} · Governo Municipal</Text>
        </View>

        {detail?.footerAbout ? (
          <Text style={prof.bio}>{detail.footerAbout}</Text>
        ) : (
          <Text style={prof.bio}>Comunicados oficiais, notícias e enquetes da prefeitura de {city.name}.</Text>
        )}

        {/* Stats */}
        <View style={prof.statsRow}>
          <View style={prof.stat}>
            <Text style={prof.statNum}>{newsCount}</Text>
            <Text style={prof.statLabel}>publicações</Text>
          </View>
          <View style={prof.statDiv} />
          <View style={prof.stat}>
            <Text style={prof.statNum}>{pollsCount}</Text>
            <Text style={prof.statLabel}>enquetes</Text>
          </View>
        </View>

        {/* Links sociais */}
        {(detail?.footerInstagram || detail?.footerFacebook || detail?.footerWhatsapp || detail?.footerPhone) && (
          <View style={prof.socialRow}>
            {detail.footerInstagram && (
              <TouchableOpacity style={prof.socialBtn} onPress={() => Linking.openURL(detail.footerInstagram!)}>
                <AtSign size={16} color="#c13584" />
              </TouchableOpacity>
            )}
            {detail.footerFacebook && (
              <TouchableOpacity style={prof.socialBtn} onPress={() => Linking.openURL(detail.footerFacebook!)}>
                <Share2 size={16} color="#1877f2" />
              </TouchableOpacity>
            )}
            {detail.footerWhatsapp && (
              <TouchableOpacity style={prof.socialBtn}
                onPress={() => Linking.openURL(`https://wa.me/${detail.footerWhatsapp!.replace(/\D/g, '')}`)}>
                <Phone size={16} color="#25d366" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={prof.divider} />
    </View>
  )
}

// ── Post: Notícia ─────────────────────────────────────────────────────────────
function NewsPost({ item, cityName, onPress }: {
  item: NewsItem; cityName: string; onPress: () => void
}) {
  const cfg = CAT_CONFIG[item.category] ?? CAT_CONFIG.GENERAL
  const Icon = cfg.icon

  return (
    <TouchableOpacity style={post.card} onPress={onPress} activeOpacity={0.94}>
      {/* Post header */}
      <View style={post.header}>
        <LinearGradient colors={[GREEN_DARK, GREEN]} style={post.authorAvatar}>
          <Text style={post.authorAvatarText}>{cityName[0]}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={post.authorName}>Prefeitura de {cityName}</Text>
          <View style={post.metaRow}>
            <Clock size={10} color="#9ca3af" />
            <Text style={post.metaTime}>{timeAgo(item.publishedAt)}</Text>
          </View>
        </View>
        <View style={[post.catBadge, { backgroundColor: cfg.bg }]}>
          <Icon size={10} color={cfg.color} />
          <Text style={[post.catText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Título */}
      <Text style={post.title}>{item.title}</Text>

      {/* Imagem (se houver) */}
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={post.image} contentFit="cover" />
      )}

      {/* Resumo */}
      {item.summary && (
        <Text style={post.body} numberOfLines={3}>{item.summary}</Text>
      )}

      {/* Rodapé */}
      <View style={post.footer}>
        <View style={post.readMore}>
          <Text style={post.readMoreText}>Ler mais</Text>
          <ArrowRight size={14} color={GREEN} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Post: Enquete ─────────────────────────────────────────────────────────────
function PollPost({ item, cityName, onPress }: {
  item: Poll; cityName: string; onPress: () => void
}) {
  return (
    <TouchableOpacity style={post.card} onPress={onPress} activeOpacity={0.94}>
      {/* Post header */}
      <View style={post.header}>
        <LinearGradient colors={[GREEN_DARK, GREEN]} style={post.authorAvatar}>
          <Text style={post.authorAvatarText}>{cityName[0]}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={post.authorName}>Prefeitura de {cityName}</Text>
          <View style={post.metaRow}>
            <Clock size={10} color="#9ca3af" />
            <Text style={post.metaTime}>Enquete ativa</Text>
          </View>
        </View>
        <View style={[post.catBadge, { backgroundColor: '#f0fdf4' }]}>
          <BarChart3 size={10} color={GREEN} />
          <Text style={[post.catText, { color: GREEN }]}>Enquete</Text>
        </View>
      </View>

      {/* Título */}
      <Text style={post.title}>{item.title}</Text>

      {/* Descrição */}
      {item.description && (
        <Text style={post.body} numberOfLines={2}>{item.description}</Text>
      )}

      {/* Barra decorativa de votos */}
      <View style={poll.barWrap}>
        <View style={poll.bar}>
          <View style={[poll.barFill, { width: '65%' }]} />
        </View>
        <View style={poll.barRow}>
          <Users size={11} color="#9ca3af" />
          <Text style={poll.barText}>{item._count.responses} respostas</Text>
          {item.endsAt && (
            <Text style={poll.barDeadline}>
              · Até {new Date(item.endsAt).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </View>
      </View>

      {/* Rodapé */}
      <View style={post.footer}>
        <View style={[post.readMore, { backgroundColor: GREEN_LIGHT, borderColor: GREEN_BORDER }]}>
          <Text style={post.readMoreText}>Participar</Text>
          <ArrowRight size={14} color={GREEN} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function CidadeScreen() {
  const router = useRouter()
  const { city } = useCityStore()

  const { data: detailData, refetch: refetchDetail } = useQuery({
    queryKey: ['city-detail', city?.slug],
    queryFn: () => api.get<CityDetail>(`/api/cities/${city!.slug}`),
    enabled: !!city?.slug,
    staleTime: 0,
  })

  const { data: bannersData, refetch: refetchBanners } = useQuery({
    queryKey: ['city-banners', city?.slug],
    queryFn: () => api.get<any[]>(`/api/cities/${city!.slug}/banners?type=CITY_HERO`),
    enabled: !!city?.slug,
    staleTime: 0,
  })

  const { data: newsData, isLoading: newsLoading, refetch: refetchNews } = useQuery({
    queryKey: ['news', city?.slug],
    queryFn: () => api.get<NewsItem[]>(`/api/news?citySlug=${city!.slug}&status=PUBLISHED`),
    enabled: !!city?.slug,
    staleTime: 0,
  })

  const { data: pollsData, isLoading: pollsLoading, refetch: refetchPolls } = useQuery({
    queryKey: ['polls', city?.slug],
    queryFn: () => api.get<{ data: Poll[] }>(`/api/polls?citySlug=${city!.slug}&status=ACTIVE`),
    enabled: !!city?.slug,
    staleTime: 0,
  })

  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([refetchDetail(), refetchBanners(), refetchNews(), refetchPolls()])
    setRefreshing(false)
  }

  const detail  = detailData as unknown as CityDetail | null
  const banners = (bannersData as unknown as any[]) ?? []
  const news    = (newsData as unknown as NewsItem[]) ?? []
  const polls   = ((pollsData as unknown as { data: Poll[] })?.data ?? [])
    .filter(p => p.status === 'ACTIVE')

  const isLoading = newsLoading || pollsLoading

  // Feed cronológico: notícias + enquetes intercaladas
  type FeedItem =
    | { kind: 'news'; data: NewsItem; sortKey: number }
    | { kind: 'poll'; data: Poll;     sortKey: number }

  const feed: FeedItem[] = [
    ...polls.map(p => ({
      kind: 'poll' as const,
      data: p,
      sortKey: Date.now(), // enquetes ativas ficam no topo
    })),
    ...news.map(n => ({
      kind: 'news' as const,
      data: n,
      sortKey: n.publishedAt ? new Date(n.publishedAt).getTime() : 0,
    })),
  ].sort((a, b) => b.sortKey - a.sortKey)

  const coverUrl = banners[0]?.imageUrl ?? null

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={feed}
        keyExtractor={(item, i) => `${item.kind}-${item.kind === 'news' ? item.data.id : item.data.id}-${i}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        ListHeaderComponent={
          city ? (
            <CityProfile
              city={city}
              detail={detail}
              bannerUrl={coverUrl}
              newsCount={news.length}
              pollsCount={polls.length}
            />
          ) : null
        }
        renderItem={({ item }) => {
          if (!city) return null
          if (item.kind === 'news') {
            return (
              <NewsPost
                item={item.data}
                cityName={city.name}
                onPress={() => router.push(`/noticias/${item.data.id}`)}
              />
            )
          }
          return (
            <PollPost
              item={item.data}
              cityName={city.name}
              onPress={() => router.push(`/enquetes/${item.data.id}`)}
            />
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Newspaper size={40} color="#e5e7eb" />
            <Text style={styles.emptyTitle}>Nenhuma publicação ainda</Text>
            <Text style={styles.emptyDesc}>A prefeitura ainda não publicou nada por aqui.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

// ── Styles: tela ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40 },
  empty: { alignItems: 'center', padding: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
})

// ── Styles: perfil ────────────────────────────────────────────────────────────
const prof = StyleSheet.create({
  wrapper: { backgroundColor: '#fff', marginBottom: 8 },

  cover: { height: 170, overflow: 'hidden' },

  avatarWrap: {
    position: 'absolute',
    top: 170 - 44, // metade do avatar sobrepõe o cover
    left: 16,
    zIndex: 10,
    width: 88, height: 88,
    borderRadius: 44,
    borderWidth: 4, borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
  },
  avatar: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#fff' },

  info: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  cityName: { fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: -0.3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#9ca3af' },
  bio: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 2 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    marginTop: 8, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  stat: { alignItems: 'center', gap: 1 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  statDiv: { width: 1, height: 28, backgroundColor: '#f3f4f6' },

  socialRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  socialBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 8, backgroundColor: '#f0f0f0' },
})

// ── Styles: posts ─────────────────────────────────────────────────────────────
const post = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginBottom: 8,
    paddingVertical: 14,
  },

  // Header do post (autor + tempo + categoria)
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, marginBottom: 10,
  },
  authorAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  authorAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  authorName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  metaTime: { fontSize: 11, color: '#9ca3af' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  catText: { fontSize: 10, fontWeight: '700' },

  // Conteúdo
  title: {
    fontSize: 16, fontWeight: '800', color: '#111827',
    lineHeight: 22, paddingHorizontal: 14, marginBottom: 8,
  },
  image: {
    width: SW, height: 220,
    marginBottom: 10,
  },
  body: {
    fontSize: 14, color: '#4b5563', lineHeight: 21,
    paddingHorizontal: 14, marginBottom: 10,
  },

  // Rodapé
  footer: {
    paddingHorizontal: 14, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    marginTop: 4,
  },
  readMore: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb', marginTop: 8,
  },
  readMoreText: { fontSize: 13, fontWeight: '700', color: GREEN },
})

// ── Styles: poll bar ──────────────────────────────────────────────────────────
const poll = StyleSheet.create({
  barWrap: { paddingHorizontal: 14, marginBottom: 8, gap: 6 },
  bar: {
    height: 6, backgroundColor: '#f0f0f0',
    borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: GREEN, borderRadius: 3 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barText: { fontSize: 12, color: '#9ca3af' },
  barDeadline: { fontSize: 12, color: '#9ca3af' },
})
