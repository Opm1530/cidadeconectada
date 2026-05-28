'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Eye, EyeOff, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/cn'

type BannerType = 'CITY_HERO' | 'HOME_GRID' | 'CART_BANNER' | 'PROMO_CAROUSEL'

interface Banner {
  id: string
  imageUrl: string
  title?: string | null
  subtitle?: string | null
  link?: string | null
  active: boolean
  order: number
  type: BannerType
}

const TABS: { type: BannerType; label: string; desc: string; max: number }[] = [
  {
    type: 'CITY_HERO',
    label: 'Carrossel principal',
    desc: 'Banners exibidos no topo do catálogo em forma de carrossel automático.',
    max: 10,
  },
  {
    type: 'PROMO_CAROUSEL',
    label: 'Banners do app',
    desc: 'Carrossel de banners promocionais exibidos no app abaixo das categorias.',
    max: 8,
  },
  {
    type: 'HOME_GRID',
    label: 'Grid promocional',
    desc: 'Até 3 banners exibidos em grade na home, abaixo dos destaques.',
    max: 3,
  },
  {
    type: 'CART_BANNER',
    label: 'Banner do carrinho',
    desc: 'Um único banner exibido dentro do carrinho de compras.',
    max: 1,
  },
]

export function BannerManager({ cityId, initialBanners }: { cityId: string; initialBanners: Banner[] }) {
  const router = useRouter()
  const [banners, setBanners] = useState(initialBanners)
  const [activeTab, setActiveTab] = useState<BannerType>('CITY_HERO')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ imageUrl: '', title: '', subtitle: '', link: '' })

  const tab = TABS.find((t) => t.type === activeTab)!
  const filtered = banners.filter((b) => b.type === activeTab)
  const atMax = filtered.length >= tab.max

  async function addBanner() {
    if (!form.imageUrl) { toast.error('URL da imagem obrigatória'); return }
    setLoading(true)
    try {
      const result = await api.post<Banner>('/api/cities/banners', {
        ...form,
        cityId,
        type: activeTab,
        order: filtered.length,
      })
      setBanners((prev) => [...prev, result])
      setForm({ imageUrl: '', title: '', subtitle: '', link: '' })
      setShowForm(false)
      toast.success('Banner adicionado!')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await api.patch(`/api/cities/banners/${id}`, { active: !active })
      setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, active: !active } : b)))
      router.refresh()
    } catch {
      toast.error('Erro ao atualizar banner')
    }
  }

  async function deleteBanner(id: string) {
    setDeleting(id)
    try {
      await api.delete(`/api/cities/banners/${id}`)
      setBanners((prev) => prev.filter((b) => b.id !== id))
      toast.success('Banner removido')
      router.refresh()
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map((t) => {
          const count = banners.filter((b) => b.type === t.type).length
          return (
            <button
              key={t.type}
              onClick={() => { setActiveTab(t.type); setShowForm(false) }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                activeTab === t.type
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  activeTab === t.type ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Descrição do tipo */}
      <p className="text-xs text-gray-400 -mt-2">{tab.desc}</p>

      {/* Lista de banners do tipo ativo */}
      {filtered.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
          <ImageIcon size={28} className="text-gray-200" />
          Nenhum banner nesta posição ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((banner, idx) => (
            <div
              key={banner.id}
              className={cn(
                'bg-white border rounded-xl overflow-hidden flex gap-4 items-center p-3 transition-opacity',
                !banner.active && 'opacity-50',
              )}
            >
              <div className="relative w-32 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                <Image src={banner.imageUrl} alt={banner.title ?? `Banner ${idx + 1}`} fill sizes="100vw" unoptimized className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{banner.title ?? `Banner ${idx + 1}`}</p>
                {banner.subtitle && <p className="text-xs text-gray-400 truncate">{banner.subtitle}</p>}
                {banner.link && <p className="text-xs text-gray-300 truncate">{banner.link}</p>}
                <span className={cn('text-xs font-medium', banner.active ? 'text-green-600' : 'text-gray-400')}>
                  {banner.active ? 'Visível' : 'Oculto'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleActive(banner.id, banner.active)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  title={banner.active ? 'Ocultar' : 'Mostrar'}
                >
                  {banner.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => deleteBanner(banner.id)}
                  disabled={deleting === banner.id}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de novo banner */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-primary-200 p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-800 text-sm">Novo banner — {tab.label}</h3>
          <Input
            label="URL da imagem *"
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Título"
              placeholder="Ex: Promoção de verão"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              label="Subtítulo"
              placeholder="Ex: Só até domingo"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            />
          </div>
          <Input
            label="Link ao clicar"
            placeholder="https://..."
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
          />
          {form.imageUrl && (
            <div className="relative h-28 rounded-lg overflow-hidden bg-gray-100">
              <Image src={form.imageUrl} alt="Preview" fill sizes="100vw" unoptimized className="object-cover" onError={() => {}} />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={addBanner} loading={loading}>Adicionar</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        !atMax ? (
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2 self-start">
            <Plus size={16} />
            Adicionar banner
          </Button>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Limite atingido para esta posição ({tab.max} banner{tab.max > 1 ? 'es' : ''} máx.).
          </p>
        )
      )}
    </div>
  )
}
