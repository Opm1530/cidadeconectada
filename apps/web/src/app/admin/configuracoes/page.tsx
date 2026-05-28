import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { CitySettingsForm } from './city-settings-form'

export default async function AdminConfiguracoesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: { city: true },
  })
  if (!cityAdmin) redirect('/')

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações da Cidade</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie as configurações de {cityAdmin.city.name}</p>
      </div>
      <CitySettingsForm city={cityAdmin.city} />
    </div>
  )
}
