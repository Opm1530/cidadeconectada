'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BarChart3, CheckCircle2, Clock, Users, ShoppingBag, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useRouter } from 'next/navigation'

interface PollOption {
  id: string
  text: string
  count: number
}

interface PollQuestion {
  id: string
  text: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT'
  required: boolean
  totalAnswers: number
  options: PollOption[]
}

interface PollData {
  id: string
  title: string
  description?: string | null
  audience: 'MERCHANTS' | 'CUSTOMERS' | 'ALL'
  status: 'ACTIVE' | 'CLOSED'
  endsAt?: string | null
  totalResponses: number
  questions: PollQuestion[]
}

interface PollVoterProps {
  poll: PollData
  citySlug: string
  hasVoted: boolean
  isLoggedIn: boolean
}

function ResultBar({ count, total, text }: { count: number; total: number; text: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-700">{text}</span>
        <span className="font-semibold text-gray-900 text-xs">{pct}% ({count})</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function PollVoter({ poll, citySlug, hasVoted, isLoggedIn }: PollVoterProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [voted, setVoted] = useState(hasVoted)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const showResults = voted || poll.status === 'CLOSED'

  function selectOption(questionId: string, optionId: string, type: string) {
    if (type === 'SINGLE_CHOICE') {
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    } else {
      setAnswers((prev) => {
        const current = (prev[questionId] as string[]) ?? []
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        }
      })
    }
  }

  function setTextAnswer(questionId: string, text: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
  }

  async function handleVote() {
    // Valida respostas obrigatórias
    for (const q of poll.questions) {
      if (!q.required) continue
      const ans = answers[q.id]
      if (!ans || (Array.isArray(ans) && ans.length === 0) || ans === '') {
        return toast.error(`Responda: "${q.text}"`)
      }
    }

    setLoading(true)
    try {
      type VoteAnswer = { questionId: string; optionId?: string; textAnswer?: string }
      const votAnswers = poll.questions.flatMap<VoteAnswer>((q) => {
        const ans = answers[q.id]
        if (q.type === 'TEXT') {
          return [{ questionId: q.id, textAnswer: (ans as string) ?? '' }]
        }
        if (q.type === 'MULTIPLE_CHOICE') {
          return ((ans as string[]) ?? []).map((optionId) => ({ questionId: q.id, optionId }))
        }
        return [{ questionId: q.id, optionId: ans as string }]
      })

      await api.post(`/api/polls/${poll.id}/vote`, { answers: votAnswers })
      setVoted(true)
      toast.success('Voto registrado! Obrigado pela participação.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao votar')
    } finally {
      setLoading(false)
    }
  }

  const audienceLabel = poll.audience === 'MERCHANTS' ? 'Lojistas' : poll.audience === 'CUSTOMERS' ? 'Clientes' : 'Todos'
  const AudienceIcon = poll.audience === 'MERCHANTS' ? ShoppingBag : Users

  return (
    <div className="flex flex-col gap-5">
      {/* Voltar */}
      <Link
        href={`/${citySlug}/enquetes`}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors self-start"
      >
        <ArrowLeft size={15} />
        Voltar às enquetes
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            {poll.status === 'CLOSED' ? (
              <CheckCircle2 size={20} className="text-gray-400" />
            ) : (
              <BarChart3 size={20} className="text-primary-500" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{poll.title}</h1>
            {poll.description && (
              <p className="text-sm text-gray-500 mt-1">{poll.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <AudienceIcon size={12} /> {audienceLabel}
              </span>
              <span className="text-xs text-gray-400">
                {poll.totalResponses} resposta{poll.totalResponses !== 1 ? 's' : ''}
              </span>
              {poll.endsAt && poll.status === 'ACTIVE' && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Clock size={11} />
                  até {new Date(poll.endsAt).toLocaleDateString('pt-BR')}
                </span>
              )}
              {poll.status === 'CLOSED' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Encerrada</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Perguntas */}
      <div className="flex flex-col gap-4">
        {poll.questions.map((q, qi) => (
          <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="font-semibold text-gray-900 text-sm mb-3">
              {qi + 1}. {q.text}
              {q.required && <span className="text-red-400 ml-1">*</span>}
            </p>

            {showResults ? (
              /* Resultados */
              q.type === 'TEXT' ? (
                <p className="text-xs text-gray-400 italic">Pergunta de resposta livre — {q.totalAnswers} resposta{q.totalAnswers !== 1 ? 's' : ''}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {q.options.map((opt) => (
                    <ResultBar
                      key={opt.id}
                      text={opt.text}
                      count={opt.count}
                      total={q.totalAnswers || poll.totalResponses}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Formulário de voto */
              q.type === 'TEXT' ? (
                <textarea
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setTextAnswer(q.id, e.target.value)}
                  rows={3}
                  placeholder="Sua resposta..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt) => {
                    const isSelected = q.type === 'SINGLE_CHOICE'
                      ? answers[q.id] === opt.id
                      : ((answers[q.id] as string[]) ?? []).includes(opt.id)

                    return (
                      <button
                        key={opt.id}
                        onClick={() => selectOption(q.id, opt.id, q.type)}
                        className={cn(
                          'flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all',
                          isSelected
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700',
                        )}
                      >
                        <span className={cn(
                          'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                          q.type === 'MULTIPLE_CHOICE' ? 'rounded' : 'rounded-full',
                          isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300',
                        )}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                        <span className="text-sm">{opt.text}</span>
                      </button>
                    )
                  })}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* CTA / Estado */}
      {poll.status === 'ACTIVE' && !voted && (
        !isLoggedIn ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
            <Lock size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Faça login para votar</p>
              <p className="text-xs text-amber-600">Sua opinião é importante e anônima.</p>
            </div>
            <Link href={`/login?redirect=/${citySlug}/enquetes/${poll.id}`} className="ml-auto shrink-0">
              <Button variant="primary" className="text-sm">Entrar</Button>
            </Link>
          </div>
        ) : (
          <Button variant="primary" loading={loading} onClick={handleVote} className="w-full py-3">
            Enviar meu voto
          </Button>
        )
      )}

      {voted && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-500 shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            Você já votou nesta enquete. Veja os resultados acima!
          </p>
        </div>
      )}
    </div>
  )
}
