import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const company = await prisma.company.findUnique({
    where: { ownerId: session.id },
  })
  if (!company) redirect('/dashboard/cadastro')

  const data = {
    name: company.name,
    description: company.description ?? '',
    phone: company.phone ?? '',
    whatsapp: company.whatsapp ?? '',
    address: company.address ?? '',
    category: company.category ?? '',
    logoUrl: company.logoUrl ?? '',
    coverUrl: company.coverUrl ?? '',
    // Pagamento
    acceptsMercadoPago: company.acceptsMercadoPago,
    mercadoPagoToken: company.mercadoPagoToken ?? '',
    acceptsPix: company.acceptsPix,
    pixKey: company.pixKey ?? '',
    acceptsCashOnDelivery: company.acceptsCashOnDelivery,
    // Entrega
    hasOwnDelivery: company.hasOwnDelivery,
    ownDeliveryFee: company.ownDeliveryFee ? Number(company.ownDeliveryFee) : 0,
    acceptsPlatformDrivers: company.acceptsPlatformDrivers,
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie as informações e preferências da sua loja</p>
      </div>
      <SettingsForm companySlug={company.slug} defaultValues={data} />
    </div>
  )
}
