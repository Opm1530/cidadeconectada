import { prisma } from '@cc/database'
import { AdminManager } from './admin-manager'

export default async function SuperAdminAdminsPage() {
  const [cityAdmins, cities, users] = await Promise.all([
    prisma.cityAdmin.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        city: { select: { id: true, name: true, state: true } },
      },
      orderBy: { city: { name: 'asc' } },
    }),
    prisma.city.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, state: true } }),
    prisma.user.findMany({
      where: { role: { in: ['CITY_ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Administradores</h1>
        <p className="text-sm text-gray-400 mt-0.5">Vincule administradores às cidades</p>
      </div>
      <AdminManager cityAdmins={cityAdmins} cities={cities} users={users} />
    </div>
  )
}
