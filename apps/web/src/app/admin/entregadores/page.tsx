import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@cc/shared'
import { Truck, Users } from 'lucide-react'
import { DriverActions } from './driver-actions'

interface Props {
  searchParams: Promise<{ status?: string }>
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'SUSPENDED', label: 'Suspensos' },
]

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Aguardando',  className: 'bg-yellow-100 text-yellow-700' },
  APPROVED:  { label: 'Aprovado',   className: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rejeitado',  className: 'bg-red-100 text-red-700' },
  SUSPENDED: { label: 'Suspenso',   className: 'bg-gray-100 text-gray-600' },
}

export default async function AdminDriversPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { status } = await searchParams

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: true },
  })
  if (!cityAdmin) redirect('/')

  const city = cityAdmin.city

  const drivers = await prisma.deliveryDriver.findMany({
    where: {
      cityId: city.id,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
    },
  })

  const pending = drivers.filter((d) => d.status === 'PENDING').length
  const approved = drivers.filter((d) => d.status === 'APPROVED').length
  const maxDrivers = city.maxDrivers

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Entregadores</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {approved} aprovado{approved !== 1 ? 's' : ''}
            {maxDrivers ? ` de ${maxDrivers} vagas` : ' · sem limite de vagas'}
            {pending > 0 && ` · ${pending} aguardando`}
          </p>
        </div>

        {/* Indicador de vagas */}
        {maxDrivers && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
            <Users size={16} className="text-gray-400" />
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${Math.min((approved / maxDrivers) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{approved}/{maxDrivers}</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {STATUS_FILTERS.map((opt) => (
          <a
            key={opt.value}
            href={`/admin/entregadores${opt.value ? `?status=${opt.value}` : ''}`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (status ?? '') === opt.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {/* Lista */}
      {drivers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center flex flex-col items-center gap-3 text-gray-400">
          <Truck size={40} strokeWidth={1} />
          <p className="text-sm">Nenhum entregador {status ? 'com este status' : 'cadastrado'} ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {drivers.map((driver) => {
            const st = STATUS_LABEL[driver.status] ?? { label: driver.status, className: 'bg-gray-100 text-gray-600' }
            return (
              <div
                key={driver.id}
                className={`bg-white border rounded-xl p-4 ${driver.status === 'PENDING' ? 'border-yellow-200' : 'border-gray-100'}`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-400 font-semibold text-sm">
                    {driver.user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{driver.user.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.className}`}>
                        {st.label}
                      </span>
                      {driver.active && driver.status === 'APPROVED' && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Online</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      {driver.user.phone && <span>{driver.user.phone}</span>}
                      {driver.user.email && <span>{driver.user.email}</span>}
                      {driver.vehicle && <span>Veículo: {driver.vehicle}</span>}
                      {driver.vehiclePlate && <span>Placa: {driver.vehiclePlate}</span>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                      <span>Taxa: <strong className="text-gray-700">{formatCurrency(Number(driver.deliveryFee))}</strong></span>
                      <span>Cadastro: {formatDate(driver.createdAt)}</span>
                    </div>
                  </div>

                  <DriverActions driverId={driver.id} currentStatus={driver.status} maxDrivers={maxDrivers} approvedCount={approved} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
