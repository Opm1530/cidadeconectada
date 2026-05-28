'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus, Trash2, Send, FileText, Eye, EyeOff,
  Users, ShoppingBag, Globe, Syringe, Shield,
  Calendar, Landmark, Leaf, GraduationCap, Newspaper,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

type NewsCategory = 'GENERAL' | 'HEALTH' | 'SECURITY' | 'EVENTS' | 'INFRASTRUCTURE' | 'ECONOMY' | 'ENVIRONMENT' | 'EDUCATION'
type NewsAudience = 'MERCHANTS' | 'CUSTOMERS' | 'ALL'
type NewsStatus = 'DRAFT' | 'PUBLISHED'

interface NewsItem {
  id: string
  title: string
  summary?: string | null
  imageUrl?: string | null
  category: NewsCategory
  audience: NewsAudience
  status: NewsStatus
  publishedAt?: string | null
  createdAt: string
}

const CATEGORY_CONFIG: Record<NewsCategory, { label: string; icon: React.ElementType; color: string }> = {
  GENERAL:        { label: 'Geral',           icon: Newspaper,   color: 'bg-gray-100 text-gray-600' },
  HEALTH:         { label: 'Saúde',           icon: Syringe,     color: 'bg-green-100 text-green-700' },
  SECURITY:       { label: 'Segurança',       icon: Shield,      color: 'bg-blue-100 text-blue-700' },
  EVENTS:         { label: 'Eventos',         icon: Calendar,    color: 'bg-purple-100 text-purple-700' },
  INFRASTRUCTURE: { label: 'Infraestrutura',  icon: Landmark,    color: 'bg-orange-100 text-orange-700' },
  ECONOMY:        { label: 'Economia',        icon: Globe,       color: 'bg-yellow-100 text-yellow-700' },
  ENVIRONMENT:    { label: 'Meio Ambiente',   icon: Leaf,        color: 'bg-emerald-100 text-emerald-700' },
  EDUCATION:      { label: 'Educação',        icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700' },
}

const AUDIENCE_CONFIG: Record<NewsAudience, { label: string; icon: React.ElementType }> = {
  ALL:       { label: 'Todos',      icon: Globe },
  MERCHANTS: { label: 'Lojistas',   icon: ShoppingBag },
  CUSTOMERS: { label: 'Clientes',   icon: Users },
}

interface NewsManagerProps {
  city: { id: string; name: string; slug: string }
  initialNews: NewsItem[]
}

export function NewsManager({ city, initialNews }: NewsManagerProps) {
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNews)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState<NewsCategory>('GENERAL')
  const [audience, setAudience] = useState<NewsAudience>('ALL')

  function resetForm() {
    setTitle(''); setSummary(''); setContent(''); setImageUrl('')
    setCategory('GENERAL'); setAudience('ALL')
    setCreating(false)
  }

  async function handleCreate(publish: boolean) {
    if (!title.trim()) return toast.error('Informe o título')
    if (!content.trim()) return toast.error('Informe o conteúdo')

    setLoading(true)
    try {
      const created = await api.post<NewsItem>('/api/news', {
        title, summary: summary || undefined,
        content, imageUrl: imageUrl || null,
        category, audience,
      })

      if (publish) {
        const published = await api.patch<NewsItem>(`/api/news/${created.id}`, { status: 'PUBLISHED' })
        setNewsList((prev) => [published, ...prev])
        toast.success('Notícia publicada!')
      } else {
        setNewsList((prev) => [created, ...prev])
        toast.success('Rascunho salvo!')
      }
      resetForm()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar')
    } finally {
      setLoading(false)
    }
  }

  async function togglePublish(item: NewsItem) {
    const newStatus: NewsStatus = item.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT'
    try {
      const updated = await api.patch<NewsItem>(`/api/news/${item.id}`, { status: newStatus })
      setNewsList((prev) => prev.map((n) => n.id === item.id ? updated : n))
      toast.success(newStatus === 'PUBLISHED' ? 'Notícia publicada!' : 'Movida para rascunho')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  async function deleteNews(id: string) {
    if (!confirm('Excluir esta notícia?')) return
    try {
      await api.delete(`/api/news/${id}`)
      setNewsList((prev) => prev.filter((n) => n.id !== id))
      toast.success('Notícia excluída')
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const published = newsList.filter((n) => n.status === 'PUBLISHED')
  const drafts = newsList.filter((n) => n.status === 'DRAFT')

  return (
    <div className="flex flex-col gap-4">
      {!creating && (
        <Button variant="primary" onClick={() => setCreating(true)} className="self-start gap-2">
          <Plus size={16} />
          Nova notícia
        </Button>
      )}

      {/* Formulário */}
      {creating && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-800">Nova notícia / comunicado</h2>

          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Campanha de Vacinação contra Gripe 2025"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resumo (exibido na listagem)</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Uma linha descrevendo a notícia..."
              maxLength={300}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo completo</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Escreva o conteúdo completo da notícia ou comunicado..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <Input
            label="URL da imagem de capa (opcional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsCategory)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Público</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as NewsAudience)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(AUDIENCE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
            <Button variant="secondary" loading={loading} onClick={() => handleCreate(false)} className="gap-2">
              <FileText size={15} />
              Salvar rascunho
            </Button>
            <Button variant="primary" loading={loading} onClick={() => handleCreate(true)} className="gap-2">
              <Send size={15} />
              Publicar agora
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {newsList.length === 0 && !creating ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          <Newspaper size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma notícia criada ainda.</p>
          <p className="text-xs mt-1 text-gray-300">Crie comunicados sobre saúde, eventos, infraestrutura e mais.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {published.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Publicadas ({published.length})</h2>
              <div className="flex flex-col gap-2">
                {published.map((item) => <NewsCard key={item.id} item={item} city={city} onToggle={togglePublish} onDelete={deleteNews} />)}
              </div>
            </section>
          )}
          {drafts.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rascunhos ({drafts.length})</h2>
              <div className="flex flex-col gap-2">
                {drafts.map((item) => <NewsCard key={item.id} item={item} city={city} onToggle={togglePublish} onDelete={deleteNews} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function NewsCard({
  item, city, onToggle, onDelete,
}: {
  item: NewsItem
  city: { slug: string }
  onToggle: (item: NewsItem) => void
  onDelete: (id: string) => void
}) {
  const cat = CATEGORY_CONFIG[item.category]
  const aud = AUDIENCE_CONFIG[item.audience]
  const CatIcon = cat.icon
  const AudIcon = aud.icon

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4">
      {/* Ícone de categoria */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cat.color)}>
        <CatIcon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-gray-900 text-sm truncate">{item.title}</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
            item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
          )}>
            {item.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
          </span>
        </div>
        {item.summary && <p className="text-xs text-gray-500 line-clamp-1">{item.summary}</p>}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <AudIcon size={11} /> {aud.label}
          </span>
          <span className="flex items-center gap-1">
            <CatIcon size={11} /> {cat.label}
          </span>
          {item.publishedAt && (
            <span>{new Date(item.publishedAt).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {item.status === 'PUBLISHED' && (
          <Link
            href={`/${city.slug}/noticias/${item.id}`}
            target="_blank"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
            title="Ver notícia"
          >
            <ExternalLink size={15} />
          </Link>
        )}
        <button
          onClick={() => onToggle(item)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            item.status === 'PUBLISHED'
              ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              : 'text-green-500 hover:text-green-700 hover:bg-green-50',
          )}
          title={item.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
        >
          {item.status === 'PUBLISHED' ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
          title="Excluir"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
