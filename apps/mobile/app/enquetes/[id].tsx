import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Users, CheckCircle, Clock, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface PollOption {
  id: string
  text: string
  order: number
  _count: { answers: number }
}

interface PollQuestion {
  id: string
  text: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT'
  required: boolean
  order: number
  options: PollOption[]
  _count: { answers: number }
}

interface Poll {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  audience: string
  endsAt: string | null
  questions: PollQuestion[]
  _count: { responses: number }
}

export default function EnqueteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isLoggedIn } = useAuthStore()

  // Selected options per question: questionId → Set of optionIds
  const [selections, setSelections] = useState<Record<string, Set<string>>>({})
  const [submitted, setSubmitted] = useState(false)

  const { data: pollData, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => api.get<Poll>(`/api/polls/${id}`),
    enabled: !!id,
  })

  const { data: voteData } = useQuery({
    queryKey: ['poll-vote', id],
    queryFn: () => api.get<{ voted: boolean }>(`/api/polls/${id}/vote`),
    enabled: !!id && isLoggedIn,
  })

  const { mutate: submitVote, isPending: voting } = useMutation({
    mutationFn: (answers: { questionId: string; optionId?: string }[]) =>
      api.post(`/api/polls/${id}/vote`, { answers }),
    onSuccess: () => {
      setSubmitted(true)
      queryClient.invalidateQueries({ queryKey: ['poll', id] })
      queryClient.invalidateQueries({ queryKey: ['poll-vote', id] })
    },
    onError: (err: any) => {
      Alert.alert('Erro', err?.message ?? 'Não foi possível registrar seu voto.')
    },
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#62a84a" size="large" />
      </SafeAreaView>
    )
  }

  const poll = pollData as unknown as Poll
  if (!poll) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFound}>Enquete não encontrada</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const alreadyVoted = (voteData as unknown as { voted: boolean })?.voted || submitted
  const isClosed = poll.status === 'CLOSED'
  const isActive = poll.status === 'ACTIVE'
  const showResults = alreadyVoted || isClosed || !isLoggedIn

  function toggleOption(question: PollQuestion, optionId: string) {
    if (!isActive || alreadyVoted) return
    setSelections(prev => {
      const current = new Set(prev[question.id] ?? [])
      if (question.type === 'SINGLE_CHOICE') {
        return { ...prev, [question.id]: new Set([optionId]) }
      }
      // MULTIPLE_CHOICE
      if (current.has(optionId)) {
        current.delete(optionId)
      } else {
        current.add(optionId)
      }
      return { ...prev, [question.id]: current }
    })
  }

  function canSubmit() {
    return poll.questions.every(q => {
      if (!q.required) return true
      const count = selections[q.id]?.size ?? 0
      return count >= 1
    })
  }

  function handleSubmit() {
    if (!isLoggedIn) {
      Alert.alert('Login necessário', 'Faça login para votar nesta enquete.')
      return
    }
    if (!canSubmit()) {
      Alert.alert('Atenção', 'Responda todas as perguntas obrigatórias.')
      return
    }

    const answers: { questionId: string; optionId: string }[] = []
    poll.questions.forEach(q => {
      const selected = selections[q.id]
      if (selected) {
        selected.forEach(optionId => {
          answers.push({ questionId: q.id, optionId })
        })
      }
    })
    submitVote(answers)
  }

  // Calcula percentual de votos por opção
  function getPercent(question: PollQuestion, option: PollOption): number {
    const total = question._count.answers
    if (total === 0) return 0
    return Math.round((option._count.answers / total) * 100)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>Enquete</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{poll.title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.statusBanner, isClosed && styles.statusBannerClosed]}>
          <BarChart3 size={18} color={isClosed ? '#6b7280' : '#62a84a'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>
              {isClosed ? 'Enquete encerrada' : isActive ? 'Enquete aberta para votos' : 'Em breve'}
            </Text>
            <View style={styles.statusMeta}>
              <Users size={11} color="#9ca3af" />
              <Text style={styles.statusMetaText}>{poll._count.responses} {poll._count.responses === 1 ? 'resposta' : 'respostas'}</Text>
              {poll.endsAt && !isClosed && (
                <>
                  <Clock size={11} color="#9ca3af" />
                  <Text style={styles.statusMetaText}>
                    Até {new Date(poll.endsAt).toLocaleDateString('pt-BR')}
                  </Text>
                </>
              )}
            </View>
          </View>
          {isActive && !alreadyVoted && (
            <View style={styles.voteBadge}>
              <Text style={styles.voteBadgeText}>Votar</Text>
            </View>
          )}
          {alreadyVoted && (
            <CheckCircle size={20} color="#16a34a" />
          )}
        </View>

        {/* Description */}
        {poll.description && (
          <Text style={styles.description}>{poll.description}</Text>
        )}

        {/* Questions */}
        {poll.questions.map((question, qi) => (
          <View key={question.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Pergunta {qi + 1}</Text>
            <Text style={styles.questionText}>{question.text}</Text>
            {question.type !== 'TEXT' && (
              <Text style={styles.questionHint}>
                {question.type === 'SINGLE_CHOICE' ? 'Escolha uma opção' : 'Pode escolher mais de uma'}
                {question.required ? ' · Obrigatório' : ''}
              </Text>
            )}

            <View style={styles.optionsList}>
              {question.options.map(option => {
                const isSelected = selections[question.id]?.has(option.id) ?? false
                const pct = getPercent(question, option)

                if (showResults) {
                  // Show results view
                  return (
                    <View key={option.id} style={styles.resultOption}>
                      <View style={styles.resultTop}>
                        <Text style={styles.resultText}>{option.text}</Text>
                        <Text style={styles.resultPct}>{pct}%</Text>
                      </View>
                      <View style={styles.resultBarBg}>
                        <View style={[styles.resultBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.resultCount}>{option._count.answers} {option._count.answers === 1 ? 'voto' : 'votos'}</Text>
                    </View>
                  )
                }

                // Voting view
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => toggleOption(question, option.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionDot, isSelected && styles.optionDotSelected]}>
                      {isSelected && <View style={styles.optionDotInner} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.text}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {/* Submit or already voted */}
        {isActive && !alreadyVoted && isLoggedIn && (
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit() || voting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit() || voting}
          >
            {voting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Confirmar voto</Text>
            }
          </TouchableOpacity>
        )}

        {alreadyVoted && (
          <View style={styles.votedBanner}>
            <CheckCircle size={20} color="#16a34a" />
            <Text style={styles.votedText}>Seu voto foi registrado com sucesso!</Text>
          </View>
        )}

        {isActive && !isLoggedIn && (
          <TouchableOpacity style={styles.loginPrompt} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginPromptText}>Faça login para participar</Text>
            <ChevronRight size={16} color="#62a84a" />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  notFound: { fontSize: 16, color: '#9ca3af' },
  backBtn: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: '#c5e3bb',
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#62a84a' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backIcon: { padding: 4 },
  headerLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  scroll: { padding: 16, gap: 14 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#d1f0c8',
  },
  statusBannerClosed: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  statusText: { fontSize: 14, fontWeight: '700', color: '#62a84a' },
  statusTextClosed: { color: '#6b7280' },
  statusMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusMetaText: { fontSize: 12, color: '#9ca3af' },
  voteBadge: {
    backgroundColor: '#62a84a', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  voteBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  description: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  questionCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, gap: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  questionNumber: {
    fontSize: 11, fontWeight: '700', color: '#62a84a',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  questionText: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 21 },
  questionHint: { fontSize: 12, color: '#9ca3af' },
  optionsList: { gap: 8, marginTop: 4 },

  // Voting options
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  optionSelected: { borderColor: '#62a84a', backgroundColor: '#f0fdf4' },
  optionDot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  optionDotSelected: { borderColor: '#62a84a' },
  optionDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#62a84a' },
  optionText: { fontSize: 14, color: '#374151', flex: 1 },
  optionTextSelected: { color: '#3d6b2e', fontWeight: '600' },

  // Results
  resultOption: { gap: 4 },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultText: { fontSize: 14, color: '#374151', flex: 1, marginRight: 8 },
  resultPct: { fontSize: 14, fontWeight: '800', color: '#62a84a' },
  resultBarBg: { height: 8, backgroundColor: '#d1f0c8', borderRadius: 4, overflow: 'hidden' },
  resultBarFill: { height: '100%', backgroundColor: '#62a84a', borderRadius: 4 },
  resultCount: { fontSize: 11, color: '#9ca3af' },

  // Submit
  submitBtn: {
    backgroundColor: '#62a84a', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  votedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  votedText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },

  loginPrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#d1f0c8',
  },
  loginPromptText: { fontSize: 14, fontWeight: '600', color: '#62a84a' },
})
