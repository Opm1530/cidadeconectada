import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { Image as ImageIcon } from 'lucide-react'
import { BannerManager } from './banner-manager'

export default async function AdminBannersPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cityAdmin = await prisma.cityAdmin.findFirst({
    where: { userId: session.id },
    include: {
      city: {
        include: { banners: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!cityAdmin) redirect('/')

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon size={20} className="text-primary-600" />
          Banners
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Gerencie os banners em diferentes posições da plataforma
        </p>
      </div>

      <BannerManager
        cityId={cityAdmin.city.id}
        initialBanners={cityAdmin.city.banners.map((b) => ({
          id: b.id,
          imageUrl: b.imageUrl,
          title: b.title,
          subtitle: b.subtitle,
          link: b.link,
          active: b.active,
          order: b.order,
          type: b.type as 'CITY_HERO' | 'HOME_GRID' | 'CART_BANNER',
        }))}
      />
    </div>
  )
}
