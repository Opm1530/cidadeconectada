'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ChevronDown, ChevronUp, Users, ShoppingBag, BarChart3, Edit3, Play, Square, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

interface PollOption {
  id?: string
  text: string
  order: number
}

interface PollQuestion {
  id?: string
  text: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT'
  required: boolean
  order: number
  options: PollOption[]
}

interface Poll {
  id: string
  title: string
  description?: string | null
  audience: 'MERCHANTS' | 'CUSTOMERS' | 'ALL'
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  startsAt?: string | null
  endsAt?: string | null
  _count: { responses: number; questions: number }
  createdAt: string
}

interface PollManagerProps {
  city: { id: string; name: string; slug: string }
  initialPolls: Poll[]
}

const AUDIENCE_LABELS = {
  MERCHANTS: { label: 'Lojistas', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
  CUSTOMERS: { label: 'Clientes', icon: Users, color: 'text-blue-600 bg-blue-50' },
  ALL: { label: 'Todos', icon: Users, color: 'text-green-600 bg-green-50' },
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Rascunho', color: 'text-gray-600 bg-gray-100' },
  ACTIVE: { label: 'Ativa', color: 'text-green-700 bg-green-100' },
  CLOSED: { label: 'Encerrada', color: 'text-red-600 bg-red-100' },
}

export function PollManager({ city, initialPolls }: PollManagerProps) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [audience, setAudience] = useState<'MERCHANTS' | 'CUSTOMERS' | 'ALL'>('ALL')
  const [endsAt, setEndsAt] = useState('')
  const [questions, setQuestions] = useState<PollQuestion[]>([
    { text: '', type: 'SINGLE_CHOICE', required: true, order: 0, options: [{ text: '', order: 0 }, { text: '', order: 1 }] },
  ])

  function resetForm() {
    setTitle('')
    setDescription('')
    setAudience('ALL')
    setEndsAt('')
    setQuestions([{ text: '', type: 'SINGLE_CHOICE', required: true, order: 0, options: [{ text: '', order: 0 }, { text: '', order: 1 }] }])
    setCreating(false)
  }

  function addQuestion() {
    setQuestions((q) => [...q, {
      text: '', type: 'SINGLE_CHOICE', required: true, order: q.length,
      options: [{ text: '', order: 0 }, { text: '', order: 1 }],
    }])
  }

  function removeQuestion(idx: number) {
    setQuestions((q) => q.filter((_, i) => i !== idx))
  }

  function updateQuestion(idx: number, field: keyof PollQuestion, value: unknown) {
    setQuestions((q) => q.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function addOption(qIdx: number) {
    setQuestions((q) => q.map((item, i) => i === qIdx
      ? { ...item, options: [...item.options, { text: '', order: item.options.length }] }
      : item
    ))
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((q) => q.map((item, i) => i === qIdx
      ? { ...item, options: item.options.filter((_, j) => j !== oIdx) }
      : item
    ))
  }

  function updateOption(qIdx: number, oIdx: number, text: string) {
    setQuestions((q) => q.map((item, i) => i === qIdx
      ? { ...item, options: item.options.map((o, j) => j === oIdx ? { ...o, text } : o) }
      : item
    ))
  }

  async function handleCreate() {
    if (!title.trim()) return toast.error('Informe o título da enquete')
    if (questions.some((q) => !q.text.trim())) return toast.error('Preencha todas as perguntas')
    if (questions.some((q) => q.type !== 'TEXT' && q.options.some((o) => !o.text.trim()))) {
      return toast.error('Preencha todas as opções')
    }

    setLoading(true)
    try {
      const res = await api.post<Poll>('/api/polls', {
        title,
        description: description || undefined,
        audience,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        questions: questions.map((q, qi) => ({
          text: q.text,
          type: q.type,
          required: q.required,
          order: qi,
          options: q.type !== 'TEXT' ? q.options.map((o, oi) => ({ text: o.text, order: oi })) : [],
        })),
      })
      setPolls((prev) => [{ ...res, _count: { responses: 0, questions: questions.length } }, ...prev])
      resetForm()
      toast.success('Enquete criada!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar enquete')
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(poll: Poll) {
    const nextStatus = poll.status === 'DRAFT' ? 'ACTIVE' : poll.status === 'ACTIVE' ? 'CLOSED' : null
    if (!nextStatus) return

    try {
      await api.patch(`/api/polls/${poll.id}`, { status: nextStatus })
      setPolls((prev) => prev.map((p) => p.id === poll.id ? { ...p, status: nextStatus as Poll['status'] } : p))
      toast.success(nextStatus === 'ACTIVE' ? 'Enquete ativada!' : 'Enquete encerrada!')
    } catch {
      toast.error('Erro ao atualizar enquete')
    }
  }

  async function deletePoll(pollId: string) {
    if (!confirm('Excluir esta enquete?')) return
    try {
      await api.delete(`/api/polls/${pollId}`)
      setPolls((prev) => prev.filter((p) => p.id !== pollId))
      toast.success('Enquete excluída')
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Botão criar */}
      {!creating && (
        <Button variant="primary" onClick={() => setCreating(true)} className="self-start">
          <Plus size={16} className="mr-2" />
          Nova enquete
        </Button>
      )}

      {/* Formulário de criação */}
      {creating && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-5">
          <h2 className="font-semibold text-gray-800">Nova enquete</h2>

          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: O que você acha do serviço de entrega?"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Contexto ou explicação da enquete..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Público-alvo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Público-alvo</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as typeof audience)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Todos</option>
                <option value="MERCHANTS">Lojistas</option>
                <option value="CUSTOMERS">Clientes</option>
              </select>
            </div>

            {/* Data de encerramento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Encerra em (opcional)</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Perguntas */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-700 text-sm">Perguntas</h3>
              <button onClick={addQuestion} className="text-primary-600 text-xs font-medium flex items-center gap-1 hover:underline">
                <Plus size={13} /> Adicionar pergunta
              </button>
            </div>

            {questions.map((q, qi) => (
              <div key={qi} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {qi + 1}
                  </span>
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
                      placeholder="Texto da pergunta..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex gap-3">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="SINGLE_CHOICE">Escolha única</option>
                        <option value="MULTIPLE_CHOICE">Múltipla escolha</option>
                        <option value="TEXT">Resposta livre</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(qi, 'required', e.target.checked)}
                          className="rounded"
                        />
                        Obrigatória
                      </label>
                    </div>
                  </div>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Opções (somente para SINGLE e MULTIPLE) */}
                {q.type !== 'TEXT' && (
                  <div className="ml-8 flex flex-col gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs">○</span>
                        <input
                          value={opt.text}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qi, oi)} className="text-gray-300 hover:text-red-400">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(qi)}
                      className="ml-4 text-xs text-primary-600 hover:underline self-start"
                    >
                      + Adicionar opção
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
            <Button variant="primary" loading={loading} onClick={handleCreate}>Criar enquete</Button>
          </div>
        </div>
      )}

      {/* Lista de enquetes */}
      {polls.length === 0 && !creating ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma enquete criada ainda.</p>
          <p className="text-xs mt-1">Crie enquetes para coletar opiniões da comunidade.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {polls.map((poll) => {
            const audienceCfg = AUDIENCE_LABELS[poll.audience]
            const statusCfg = STATUS_CONFIG[poll.status]
            const AudienceIcon = audienceCfg.icon

            return (
              <div key={poll.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{poll.title}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full', audienceCfg.color)}>
                        <AudienceIcon size={11} />
                        {audienceCfg.label}
                      </span>
                      <span>{poll._count.questions} pergunta{poll._count.questions !== 1 ? 's' : ''}</span>
                      <span>{poll._count.responses} resposta{poll._count.responses !== 1 ? 's' : ''}</span>
                    </div>
                    {poll.endsAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Encerra em {new Date(poll.endsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/${city.slug}/enquetes/${poll.id}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                      title="Ver enquete"
                    >
                      <ExternalLink size={15} />
                    </Link>
                    {poll.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => toggleStatus(poll)}
                          className="p-2 text-green-500 hover:text-green-700 rounded-lg hover:bg-green-50"
                          title="Ativar"
                        >
                          <Play size={15} />
                        </button>
                        <button
                          onClick={() => deletePoll(poll.id)}
                          className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    {poll.status === 'ACTIVE' && (
                      <button
                        onClick={() => toggleStatus(poll)}
                        className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Encerrar"
                      >
                        <Square size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
