'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface DriverActionsProps {
  driverId: string
  currentStatus: string
  maxDrivers: number | null
  approvedCount: number
}

export function DriverActions({ driverId, currentStatus, maxDrivers, approvedCount }: DriverActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function update(status: string) {
    // Verifica limite de vagas antes de aprovar
    if (status === 'APPROVED' && maxDrivers !== null && approvedCount >= maxDrivers) {
      toast.error(`Limite de ${maxDrivers} entregadores atingido. Aumente o limite nas configurações.`)
      return
    }

    setLoading(status)
    try {
      await api.patch(`/api/drivers/${driverId}`, { status })
      const labels: Record<string, string> = {
        APPROVED: 'Entregador aprovado!',
        REJECTED: 'Entregador rejeitado.',
        SUSPENDED: 'Entregador suspenso.',
      }
      toast.success(labels[status] ?? 'Status atualizado')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
      {currentStatus === 'PENDING' && (
        <>
          <Button size="sm" variant="primary" loading={loading === 'APPROVED'} onClick={() => update('APPROVED')}>
            Aprovar
          </Button>
          <Button size="sm" variant="danger" loading={loading === 'REJECTED'} onClick={() => update('REJECTED')}>
            Rejeitar
          </Button>
        </>
      )}
      {currentStatus === 'APPROVED' && (
        <Button size="sm" variant="outline" loading={loading === 'SUSPENDED'} onClick={() => update('SUSPENDED')}>
          Suspender
        </Button>
      )}
      {(currentStatus === 'REJECTED' || currentStatus === 'SUSPENDED') && (
        <Button size="sm" variant="secondary" loading={loading === 'APPROVED'} onClick={() => update('APPROVED')}>
          Reativar
        </Button>
      )}
    </div>
  )
}
