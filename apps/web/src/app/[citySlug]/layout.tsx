import { notFound } from 'next/navigation'
import { prisma } from '@cc/database'
import { CityHeader } from '@/components/layout/city-header'
import { CityFooter } from '@/components/layout/city-footer'
import { CityPersist } from '@/components/city-persist'

interface Props {
  children: React.ReactNode
  params: Promise<{ citySlug: string }>
}

export default async function CityLayout({ children, params }: Props) {
  const { citySlug } = await params

  const city = await prisma.city.findUnique({
    where: { slug: citySlug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      footerAbout: true,
      footerPhone: true,
      footerEmail: true,
      footerAddress: true,
      footerInstagram: true,
      footerFacebook: true,
      footerWhatsapp: true,
    },
  })

  if (!city) notFound()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Salva a cidade no localStorage para redirecionar o cliente direto após login */}
      <CityPersist slug={city.slug} />
      <CityHeader citySlug={city.slug} cityName={city.name} />
      <div className="flex-1">{children}</div>
      <CityFooter city={city} />
    </div>
  )
}
