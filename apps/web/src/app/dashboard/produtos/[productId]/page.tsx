import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { redirect, notFound } from 'next/navigation'
import { ProductForm } from '../product-form'

interface Props {
  params: Promise<{ productId: string }>
}

export default async function EditProductPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { productId } = await params
  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) redirect('/dashboard/cadastro')

  const product = await prisma.product.findUnique({
    where: { id: productId, companyId: company.id },
    include: {
      optionGroups: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!product) notFound()

  const defaultValues = {
    name: product.name,
    description: product.description ?? undefined,
    price: Number(product.price),
    type: product.type as 'PRODUCT' | 'SERVICE',
    optionGroups: product.optionGroups.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type as 'SINGLE' | 'MULTIPLE',
      required: g.required,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceAdd: Number(o.priceAdd),
      })),
    })),
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Editar Produto</h1>
        <p className="text-sm text-gray-400 mt-0.5">{product.name}</p>
      </div>
      <ProductForm defaultValues={defaultValues} productId={product.id} />
    </div>
  )
}
