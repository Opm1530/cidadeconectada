'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CompanyActions({ companySlug, active }: { companySlug: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggleActive() {
    setLoading(true)
    try {
      await api.patch(`/api/companies/${companySlug}`, { active: !active })
      toast.success(active ? 'Empresa desativada' : 'Empresa ativada!')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        size="sm"
        variant={active ? 'outline' : 'primary'}
        loading={loading}
        onClick={toggleActive}
      >
        {active ? 'Desativar' : 'Ativar'}
      </Button>
    </div>
  )
}
