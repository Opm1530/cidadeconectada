import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { ok, created, badRequest, forbidden, unauthorized } from '@/lib/api-response'

const optionSchema = z.object({
  name: z.string().min(1),
  priceAdd: z.number().min(0).default(0),
  order: z.number().int().default(0),
})

const optionGroupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  order: z.number().int().default(0),
  options: z.array(optionSchema).default([]),
})

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  imageUrl: z.string().url().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  order: z.number().int().default(0),
  optionGroups: z.array(optionGroupSchema).default([]),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const cityId = searchParams.get('cityId')
  const idsParam = searchParams.get('ids')
  const limit = Number(searchParams.get('limit') ?? 20)

  // Busca por lista de IDs (ex: favoritos)
  if (idsParam) {
    const ids = idsParam.split(',').filter(Boolean).slice(0, 100)
    if (ids.length === 0) return ok([])
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: {
        id: true, name: true, description: true, price: true, imageUrl: true,
        company: { select: { id: true, name: true, slug: true, category: true } },
      },
    })
    return ok(products)
  }

  if (!companyId && !cityId) return badRequest('companyId ou cityId é obrigatório')

  // Busca por empresa (detalhe de loja ou gestão do lojista)
  if (companyId) {
    const showAll = searchParams.get('all') === 'true'

    // all=true só é permitido para o dono da empresa
    let isOwner = false
    if (showAll) {
      const session = await getSession()
      if (session) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { ownerId: true },
        })
        isOwner = company?.ownerId === session.id
      }
    }

    const products = await prisma.product.findMany({
      where: { companyId, ...(isOwner ? {} : { active: true }) },
      orderBy: { order: 'asc' },
      include: {
        optionGroups: {
          orderBy: { order: 'asc' },
          include: { options: { where: { active: true }, orderBy: { order: 'asc' } } },
        },
      },
    })
    return ok(products)
  }

  // Busca por cidade — produtos com paginação
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const sort = searchParams.get('sort') // 'popular' | null
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const skip = (page - 1) * limit

  const where = {
    active: true,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    company: { cityId: cityId!, active: true, ...(category ? { category } : {}) },
  }

  const orderBy: any = sort === 'popular'
    ? { orderItems: { _count: 'desc' } }
    : { createdAt: 'desc' }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      skip,
      select: {
        id: true, name: true, description: true, price: true, imageUrl: true, category: true,
        company: { select: { id: true, name: true, slug: true, category: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)
  return ok({ data: products, total, page, totalPages })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'COMPANY_OWNER') return unauthorized()

  const company = await prisma.company.findUnique({ where: { ownerId: session.id } })
  if (!company) return forbidden('Empresa não encontrada')

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0].message)

  const { optionGroups, ...productData } = parsed.data

  const product = await prisma.product.create({
    data: {
      ...productData,
      companyId: company.id,
      optionGroups: {
        create: optionGroups.map((group) => ({
          ...group,
          options: { create: group.options },
        })),
      },
    },
    include: {
      optionGroups: { include: { options: true } },
    },
  })

  return created(product)
}
