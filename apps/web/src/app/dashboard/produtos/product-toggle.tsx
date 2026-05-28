'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export function ProductToggle({ productId, active }: { productId: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await api.patch(`/api/products/${productId}`, { active: !active })
      router.refresh()
    } catch {
      toast.error('Erro ao alterar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${active ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
