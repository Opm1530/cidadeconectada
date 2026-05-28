import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@cc/shared'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductToggle } from './product-toggle'

export default async function ProductsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) redirect('/dashboard/cadastro')

  const products = await prisma.product.findMany({
    where: { companyId: company.id },
    orderBy: [{ active: 'desc' }, { order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { optionGroups: true } } },
  })

  const productCount = products.filter((p) => p.active && p.type === 'PRODUCT').length
  const serviceCount = products.filter((p) => p.active && p.type === 'SERVICE').length

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {productCount} produto{productCount !== 1 ? 's' : ''} · {serviceCount} serviço{serviceCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/produtos/novo">
          <Button className="gap-2">
            <Plus size={16} />
            Novo produto
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center flex flex-col items-center gap-3 text-gray-400">
          <Package size={40} strokeWidth={1} />
          <p className="text-sm">Nenhum produto cadastrado ainda.</p>
          <Link href="/dashboard/produtos/novo">
            <Button size="sm">Adicionar produto</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-colors ${product.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
            >
              {/* Tipo badge */}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                {product.type === 'SERVICE' ? 'Serviço' : 'Produto'}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm font-semibold text-primary-600">{formatCurrency(Number(product.price))}</span>
                  {product._count.optionGroups > 0 && (
                    <span className="text-xs text-gray-400">{product._count.optionGroups} grupo{product._count.optionGroups !== 1 ? 's' : ''} de opções</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <ProductToggle productId={product.id} active={product.active} />
                <Link
                  href={`/dashboard/produtos/${product.id}`}
                  className="text-xs text-primary-600 hover:underline px-2 py-1"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
