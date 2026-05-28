import { prisma } from '@cc/database'
import { UserManager } from './user-manager'

export default async function SuperAdminUsuariosPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      city: { select: { id: true, name: true, state: true } },
      company: { select: { id: true, name: true, active: true } },
      _count: { select: { orders: true } },
    },
  })

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
        <p className="text-sm text-gray-400 mt-0.5">{users.length} usuários cadastrados na plataforma</p>
      </div>
      <UserManager users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />
    </div>
  )
}
