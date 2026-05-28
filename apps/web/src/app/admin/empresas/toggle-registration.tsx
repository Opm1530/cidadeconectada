'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export function ToggleRegistration({ citySlug, freeRegistration }: { citySlug: string; freeRegistration: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(freeRegistration)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await api.patch(`/api/cities/${citySlug}`, { freeCompanyRegistration: !value })
      setValue(!value)
      toast.success(!value ? 'Cadastro livre ativado' : 'Cadastro requer aprovação manual')
      router.refresh()
    } catch {
      toast.error('Erro ao alterar configuração')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${value ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
