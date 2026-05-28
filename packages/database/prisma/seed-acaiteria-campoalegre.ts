import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Configuração ────────────────────────────────────────────────────────────
// Altere as variáveis abaixo antes de rodar o seed.
const CITY_SLUG   = 'campo-alegre-de-goias'           // slug da cidade já cadastrada no banco
const OWNER_EMAIL = 'sabore@campoalegre.com.br'
const OWNER_NAME  = 'Saborê Açaiteria Campo Alegre'
// ─────────────────────────────────────────────────────────────────────────────

const IMG = {
  acai:         'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80&fit=crop',
  acai_shake:   'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop',
  sorvete:      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80&fit=crop',
  sorvete_cone: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&q=80&fit=crop',
  milkshake:    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop',
  picole:       'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80&fit=crop',
  brownie:      'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&q=80&fit=crop',
  chocolate_q:  'https://images.unsplash.com/photo-1542990253-a781e9c2e36c?w=600&q=80&fit=crop',
  pote:         'https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=600&q=80&fit=crop',
  bebida:       'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&q=80&fit=crop',
  fruta:        'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80&fit=crop',
  complemento:  'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80&fit=crop',
}

async function clearProducts(companyId: string) {
  const existing = await prisma.product.findMany({ where: { companyId }, select: { id: true } })
  const ids = existing.map(p => p.id)
  if (ids.length > 0) {
    await prisma.orderItem.deleteMany({ where: { productId: { in: ids } } })
  }
  await prisma.product.deleteMany({ where: { companyId } })
}

// ─── Opções compartilhadas ────────────────────────────────────────────────────

const ADICIONAIS_SEPARADOS = [
  { name: 'Pote Leite em pó',         priceAdd: 2.5, order: 0 },
  { name: 'Pote Granola',             priceAdd: 2,   order: 1 },
  { name: 'Pote Paçoca',              priceAdd: 2.5, order: 2 },
  { name: 'Pote Amendoim',            priceAdd: 2,   order: 3 },
  { name: 'Pote Castanha de cajú',    priceAdd: 3,   order: 4 },
  { name: 'Pote Ovomaltine',          priceAdd: 3.5, order: 5 },
  { name: 'Pote Granulado',           priceAdd: 2.5, order: 6 },
  { name: 'Pote Confete',             priceAdd: 3,   order: 7 },
  { name: 'Pote Chocoball',           priceAdd: 2.5, order: 8 },
  { name: 'Pote Gotas de chocolate',  priceAdd: 3,   order: 9 },
  { name: '1 un Ouro branco',         priceAdd: 2.5, order: 10 },
  { name: '1 un Sonho de valsa',      priceAdd: 2.5, order: 11 },
  { name: 'Pote Bis',                 priceAdd: 2.5, order: 12 },
  { name: 'Pote Leite condensado',    priceAdd: 2,   order: 13 },
  { name: 'Pote mel',                 priceAdd: 6,   order: 14 },
  { name: 'Pote Nutella',             priceAdd: 6,   order: 15 },
  { name: 'Pote Avelã',               priceAdd: 4,   order: 16 },
  { name: 'Pote Creme de ovomaltine', priceAdd: 6,   order: 17 },
  { name: 'Pote Creme de maltovo',    priceAdd: 4,   order: 18 },
  { name: 'Pote Pistache di dubai',   priceAdd: 8,   order: 19 },
  { name: 'Pote Creme de leitinho',   priceAdd: 4,   order: 20 },
  { name: 'Pote Creme de amendoim',   priceAdd: 4,   order: 21 },
  { name: 'Pote Caramelo salgado',    priceAdd: 4,   order: 22 },
  { name: 'Pote Brigadeiro',          priceAdd: 4,   order: 23 },
  { name: 'Pote Cookie branco',       priceAdd: 4,   order: 24 },
  { name: 'Pote Cob. de chocolate',   priceAdd: 3,   order: 25 },
  { name: 'Pote Cob. de morango',     priceAdd: 3,   order: 26 },
  { name: 'Pote Cob. fini beijos',    priceAdd: 4,   order: 27 },
]

const COBERTURA = [
  { name: 'Cobertura de chocolate',      priceAdd: 0, order: 0 },
  { name: 'Cobertura de morango',        priceAdd: 0, order: 1 },
  { name: 'Cobertura fini beijos',       priceAdd: 0, order: 2 },
  { name: 'Cobertura de caramelo',       priceAdd: 0, order: 3 },
  { name: 'Cobertura de leite condensado', priceAdd: 0, order: 4 },
  { name: 'Cobertura de maracujá',       priceAdd: 0, order: 5 },
  { name: 'Cobertura de limão',          priceAdd: 0, order: 6 },
]

const SABOR_SORVETE = [
  { name: 'Baunilha',                   priceAdd: 0, order: 0 },
  { name: 'Chocolate',                  priceAdd: 0, order: 1 },
  { name: 'Misto (baunilha e chocolate)', priceAdd: 0, order: 2 },
]

const COMPLEMENTOS_GRATIS_5 = [
  { name: 'Morango',           priceAdd: 0, order: 0 },
  { name: 'Banana',            priceAdd: 0, order: 1 },
  { name: 'Kiwi',              priceAdd: 0, order: 2 },
  { name: 'Uva verde',         priceAdd: 0, order: 3 },
  { name: 'Manga',             priceAdd: 0, order: 4 },
  { name: 'Leite Condensado',  priceAdd: 0, order: 5 },
  { name: 'Leite em Pó',       priceAdd: 0, order: 6 },
  { name: 'Mel',               priceAdd: 0, order: 7 },
  { name: 'Amendoim',          priceAdd: 0, order: 8 },
  { name: 'Castanha de Caju',  priceAdd: 0, order: 9 },
  { name: 'Paçoca',            priceAdd: 0, order: 10 },
  { name: 'Granola',           priceAdd: 0, order: 11 },
  { name: 'Ovomaltine',        priceAdd: 0, order: 12 },
  { name: 'Ganache de chocolate', priceAdd: 0, order: 13 },
  { name: 'Guloseima Jujuba',  priceAdd: 0, order: 14 },
]

const ADICIONAIS_EXTRAS_COPO = [
  { name: 'Nutella',               priceAdd: 3, order: 0 },
  { name: 'Creme de Avelã',        priceAdd: 2, order: 1 },
  { name: 'Creme de Ovomaltine',   priceAdd: 3, order: 2 },
  { name: 'Creme de Maltovo',      priceAdd: 2, order: 3 },
  { name: 'Creme de Leitinho',     priceAdd: 2, order: 4 },
  { name: 'Creme de Amendoím',     priceAdd: 2, order: 5 },
  { name: 'Caramelo salgado',      priceAdd: 2, order: 6 },
  { name: 'Brigadeiro',            priceAdd: 2, order: 7 },
  { name: 'Creme de Cookies Branco', priceAdd: 2, order: 8 },
  { name: 'Creme de Morango',      priceAdd: 2, order: 9 },
  { name: 'Leite Ninho 20g',       priceAdd: 2, order: 10 },
  { name: 'Leite condensado 25g',  priceAdd: 2, order: 11 },
  { name: 'Sonho de Valsa',        priceAdd: 2, order: 12 },
  { name: 'Ouro Branco',           priceAdd: 2, order: 13 },
  { name: 'Bombom Beijinho',       priceAdd: 2, order: 14 },
  { name: 'Bis',                   priceAdd: 2, order: 15 },
  { name: 'Oreo',                  priceAdd: 2, order: 16 },
  { name: 'Confete',               priceAdd: 2, order: 17 },
  { name: 'Chocoball',             priceAdd: 2, order: 18 },
  { name: 'Gotas de Chocolate',    priceAdd: 2, order: 19 },
  { name: 'Mel',                   priceAdd: 2, order: 20 },
]

const ACOMPANHAMENTOS_BIG = [
  { name: 'Ganache de chocolate', priceAdd: 0, order: 0 },
  { name: 'Amendoim',             priceAdd: 0, order: 1 },
  { name: 'Bis',                  priceAdd: 0, order: 2 },
  { name: 'Bombom Beijinho',      priceAdd: 0, order: 3 },
  { name: 'Castanha de cajú',     priceAdd: 0, order: 4 },
  { name: 'Chocoball',            priceAdd: 0, order: 5 },
  { name: 'Confete',              priceAdd: 0, order: 6 },
  { name: 'Gotas de chocolate',   priceAdd: 0, order: 7 },
  { name: 'Granola',              priceAdd: 0, order: 8 },
  { name: 'Granulado',            priceAdd: 0, order: 9 },
  { name: 'Leite Ninho',          priceAdd: 0, order: 10 },
  { name: 'Oreo',                 priceAdd: 0, order: 11 },
  { name: 'Ouro branco',          priceAdd: 0, order: 12 },
  { name: 'Ovomaltine',           priceAdd: 0, order: 13 },
  { name: 'Sonho de valsa',       priceAdd: 0, order: 14 },
  { name: 'Paçoca',               priceAdd: 0, order: 15 },
]

const ADICIONAIS_EXTRAS_OPCIONAL = [
  { name: 'Nutella',               priceAdd: 3, order: 0 },
  { name: 'Creme de avelã',        priceAdd: 2, order: 1 },
  { name: 'Creme de leitinho',     priceAdd: 2, order: 2 },
  { name: 'Creme de ovomaltine',   priceAdd: 3, order: 3 },
  { name: 'Creme de maltovo',      priceAdd: 2, order: 4 },
  { name: 'Pistache',              priceAdd: 3, order: 5 },
  { name: 'Skimo',                 priceAdd: 2, order: 6 },
  { name: 'Creme de cookies branco', priceAdd: 2, order: 7 },
  { name: 'Creme de amendoim',     priceAdd: 2, order: 8 },
  { name: 'Brigadeiro',            priceAdd: 2, order: 9 },
  { name: 'Caramelo salgado',      priceAdd: 2, order: 10 },
]

const ADICIONAIS_TEMPORADA = [
  { name: 'Sorvete',          priceAdd: 5,  order: 0 },
  { name: 'Calda',            priceAdd: 3,  order: 1 },
  { name: 'Brownie',          priceAdd: 12, order: 2 },
  { name: 'Chocolate quente', priceAdd: 18, order: 3 },
]

async function main() {
  console.log('🌱 Seed Açaiteria Campo Alegre...')

  // ── Cidade ────────────────────────────────────────────────────────────────
  const city = await prisma.city.findUnique({ where: { slug: CITY_SLUG } })
  if (!city) {
    console.error(`❌ Cidade com slug "${CITY_SLUG}" não encontrada. Cadastre a cidade primeiro.`)
    process.exit(1)
  }
  console.log(`✅ Cidade encontrada: ${city.name}`)

  // ── Dono da loja ──────────────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      password: await hash('loja123', 12),
      role: Role.COMPANY_OWNER,
      cityId: city.id,
    },
  })

  // ── Empresa ───────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { slug: 'sabore-acaiteria-campo-alegre' },
    update: {},
    create: {
      name: 'Saborê Açaiteria',
      slug: 'sabore-acaiteria-campo-alegre',
      description: 'Açaí, sorvetes, milk shakes e muito mais. Venha experimentar!',
      category: 'Açaí',
      phone: '',
      whatsapp: '',
      cityId: city.id,
      ownerId: owner.id,
      active: true,
      acceptsPix: true,
      acceptsCashOnDelivery: true,
      acceptsPlatformDrivers: true,
      openingHours: {
        mon: { open: '14:00', close: '22:00' },
        tue: { open: '14:00', close: '22:00' },
        wed: { open: '14:00', close: '22:00' },
        thu: { open: '14:00', close: '22:00' },
        fri: { open: '14:00', close: '23:00' },
        sat: { open: '13:00', close: '23:00' },
        sun: { open: '14:00', close: '22:00' },
      },
    },
  })
  console.log(`✅ Empresa: ${company.name} (${company.slug})`)

  await clearProducts(company.id)
  console.log('🗑️  Produtos anteriores removidos')

  const c = company.id
  let order = 0

  // ══════════════════════════════════════════════════════════════════════════
  // AÇAÍ
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Açaí', companyId: c, order: order++, price: 0, category: 'Açaí', imageUrl: IMG.acai,
    description: 'Seu açaí pode ir com 5 complementos tradicionais sem nenhum custo, sendo cobrado separadamente apenas os complementos premium.',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu açaí?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 16, order: 0 },
          { name: '400ml', priceAdd: 19, order: 1 },
          { name: '500ml', priceAdd: 22, order: 2 },
        ] } },
      { name: 'Escolha até 5 complementos Grátis', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 5, order: 1,
        options: { create: COMPLEMENTOS_GRATIS_5 } },
      { name: 'Adicionais Extras incluso no copo', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 2, order: 2,
        options: { create: ADICIONAIS_EXTRAS_COPO } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 3,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // AÇAÍ 250ml
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Açaí 250ml 2 complementos', companyId: c, order: order++, price: 13, category: 'Açaí 250ml', imageUrl: IMG.acai,
    description: 'Açaí de 250ml com até 2 complementos e possibilidade de 1 adicional extra.',
    optionGroups: { create: [
      { name: 'Escolha até 2 complementos', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 2, order: 0,
        options: { create: [
          { name: 'Banana',          priceAdd: 0, order: 0 },
          { name: 'Kiwi',            priceAdd: 0, order: 1 },
          { name: 'Leite condensado',priceAdd: 0, order: 2 },
          { name: 'Leite em pó',     priceAdd: 0, order: 3 },
          { name: 'Paçoca',          priceAdd: 0, order: 4 },
          { name: 'Amendoim',        priceAdd: 0, order: 5 },
          { name: 'Ovomaltine',      priceAdd: 0, order: 6 },
        ] } },
      { name: 'Adicional extra', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Nutella',                  priceAdd: 3, order: 0 },
          { name: 'Creme de Leitinho',        priceAdd: 2, order: 1 },
          { name: 'Creme de Ovomaltine',      priceAdd: 2, order: 2 },
          { name: 'Creme de Cookies Branco',  priceAdd: 2, order: 3 },
          { name: 'Creme de Amendoim',        priceAdd: 2, order: 4 },
        ] } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 2,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Açaí 250ml 5 complementos', companyId: c, order: order++, price: 14, category: 'Açaí 250ml', imageUrl: IMG.acai,
    description: 'Açaí de 250ml com até 5 complementos e possibilidade de 1 adicional extra.',
    optionGroups: { create: [
      { name: 'Escolha até 5 complementos Grátis', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 5, order: 0,
        options: { create: COMPLEMENTOS_GRATIS_5 } },
      { name: 'Adicional extra', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Nutella',                  priceAdd: 3, order: 0 },
          { name: 'Creme de Leitinho',        priceAdd: 2, order: 1 },
          { name: 'Creme de Ovomaltine',      priceAdd: 2, order: 2 },
          { name: 'Creme de Cookies Branco',  priceAdd: 2, order: 3 },
          { name: 'Creme de Amendoim',        priceAdd: 2, order: 4 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // AÇAÍ TRIO
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Açaí Trio', companyId: c, order: order++, price: 0, category: 'Açaí Trio', imageUrl: IMG.acai,
    description: 'Açaí com até 3 cremes divididos em camadas, onde cada parte do seu açaí tem um sabor especial!',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu açaí Trio?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 17, order: 0 },
          { name: '400ml', priceAdd: 20, order: 1 },
          { name: '500ml', priceAdd: 23, order: 2 },
        ] } },
      { name: 'Cremes', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 3, order: 1,
        options: { create: [
          { name: 'Brigadeiro',             priceAdd: 0, order: 0 },
          { name: 'Creme de cookies branco',priceAdd: 0, order: 1 },
          { name: 'Creme de avelã',         priceAdd: 0, order: 2 },
          { name: 'Creme de maltovo',       priceAdd: 0, order: 3 },
          { name: 'Creme de leitinho',      priceAdd: 0, order: 4 },
          { name: 'Creme de amendoim',      priceAdd: 0, order: 5 },
          { name: 'Creme de Morango',       priceAdd: 0, order: 6 },
          { name: 'Pistache',              priceAdd: 0, order: 7 },
          { name: 'Creme de ovomaltine',    priceAdd: 0, order: 8 },
          { name: 'Nutella',               priceAdd: 0, order: 9 },
        ] } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 2,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // AÇAÍ SHAKE
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Açaí Shake', companyId: c, order: order++, price: 0, category: 'Açaí Shake', imageUrl: IMG.acai_shake,
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu açaí shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 16, order: 0 },
          { name: '400ml', priceAdd: 19, order: 1 },
          { name: '500ml', priceAdd: 22, order: 2 },
        ] } },
      { name: 'Escolha o sabor do seu shake', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Açaí Shake Amendoim',                  priceAdd: 0, order: 0 },
          { name: 'Açaí Shake Banana',                    priceAdd: 0, order: 1 },
          { name: 'Açaí Shake banana com leite ninho',    priceAdd: 0, order: 2 },
          { name: 'Açaí Shake banana com amendoim',       priceAdd: 0, order: 3 },
          { name: 'Açaí Shake Ninho',                     priceAdd: 0, order: 4 },
          { name: 'Açaí Shake Ninho com leite condensado',priceAdd: 0, order: 5 },
          { name: 'Açaí Shake Paçoca',                    priceAdd: 0, order: 6 },
          { name: 'Açaí Shake paçoca com amendoim',       priceAdd: 0, order: 7 },
          { name: 'Açaí Shake Tradicional',               priceAdd: 0, order: 8 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // CASADINHO
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Casadinho camadinha', companyId: c, order: order++, price: 0, category: 'Casadinho', imageUrl: IMG.acai,
    description: 'Combinação perfeita do açaí com sorvete de baunilha: duas camadas de açaí + duas camadas de sorvete e 4 complementos.',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu açaí?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 16, order: 0 },
          { name: '400ml', priceAdd: 19, order: 1 },
          { name: '500ml', priceAdd: 22, order: 2 },
        ] } },
      { name: 'Complementos A', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 2, order: 1,
        options: { create: [
          { name: 'Leite condensado', priceAdd: 0, order: 0 },
          { name: 'Leite em pó',      priceAdd: 0, order: 1 },
          { name: 'Paçoca',           priceAdd: 0, order: 2 },
          { name: 'Ovomaltine',       priceAdd: 0, order: 3 },
          { name: 'Granola',          priceAdd: 0, order: 4 },
          { name: 'Amendoim',         priceAdd: 0, order: 5 },
          { name: 'Castanha de cajú', priceAdd: 0, order: 6 },
        ] } },
      { name: 'Complementos B', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 2, order: 2,
        options: { create: [
          { name: 'Morango',         priceAdd: 0, order: 0 },
          { name: 'Banana',          priceAdd: 0, order: 1 },
          { name: 'Kiwi',            priceAdd: 0, order: 2 },
          { name: 'Manga',           priceAdd: 0, order: 3 },
          { name: 'Ouro branco',     priceAdd: 0, order: 4 },
          { name: 'Sonho de valsa',  priceAdd: 0, order: 5 },
          { name: 'Bombom beijinho', priceAdd: 0, order: 6 },
          { name: 'Bis',             priceAdd: 0, order: 7 },
          { name: 'Chocoball',       priceAdd: 0, order: 8 },
          { name: 'Gotas de chocolate', priceAdd: 0, order: 9 },
          { name: 'Confete',         priceAdd: 0, order: 10 },
          { name: 'Uva verde',       priceAdd: 0, order: 11 },
        ] } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 3,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Casadinho duplo', companyId: c, order: order++, price: 0, category: 'Casadinho', imageUrl: IMG.acai,
    description: 'Combinação perfeita entre cremosidade e um contraste que se encaixa perfeitamente mesclando sabor e suavidade.',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu casadinho?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 16, order: 0 },
          { name: '400ml', priceAdd: 19, order: 1 },
          { name: '500ml', priceAdd: 22, order: 2 },
        ] } },
      { name: 'Qual será o seu casadinho?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Casadinho ninho',              priceAdd: 0, order: 0 },
          { name: 'Casadinho ninho crocante',     priceAdd: 0, order: 1 },
          { name: 'Casadinho paçoca',             priceAdd: 0, order: 2 },
          { name: 'Casadinho amendoim',           priceAdd: 0, order: 3 },
          { name: 'Casadinho morango com ninho',  priceAdd: 0, order: 4 },
          { name: 'Casadinho banana',             priceAdd: 0, order: 5 },
          { name: 'Casadinho banana com ninho',   priceAdd: 0, order: 6 },
          { name: 'Casadinho oreo',               priceAdd: 0, order: 7 },
        ] } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 2,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // SORVETES
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Copo de sorvete', companyId: c, order: order++, price: 0, category: 'Sorvetes', imageUrl: IMG.sorvete,
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu Sorvete?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'P', priceAdd: 4, order: 0 },
          { name: 'M', priceAdd: 6, order: 1 },
          { name: 'G', priceAdd: 7, order: 2 },
        ] } },
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: SABOR_SORVETE } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 2,
        options: { create: COBERTURA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Copo de sorvete MIX', companyId: c, order: order++, price: 0, category: 'Sorvetes', imageUrl: IMG.sorvete,
    optionGroups: { create: [
      { name: 'Qual o tamanho do copo?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'P', priceAdd: 4.5, order: 0 },
          { name: 'M', priceAdd: 6.5, order: 1 },
          { name: 'G', priceAdd: 7.5, order: 2 },
        ] } },
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: SABOR_SORVETE } },
      { name: 'Complementos copo MIX', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 2,
        options: { create: [
          { name: 'Confete',          priceAdd: 0, order: 0 },
          { name: 'Chocoball',        priceAdd: 0, order: 1 },
          { name: 'Gotas de chocolate', priceAdd: 0, order: 2 },
          { name: 'Ovomaltine',       priceAdd: 0, order: 3 },
          { name: 'Leite ninho',      priceAdd: 0, order: 4 },
          { name: 'Paçoca',           priceAdd: 0, order: 5 },
          { name: 'Amendoim',         priceAdd: 0, order: 6 },
        ] } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 3,
        options: { create: COBERTURA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Sundae', companyId: c, order: order++, price: 7.5, category: 'Sorvetes', imageUrl: IMG.sorvete,
    optionGroups: { create: [
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: SABOR_SORVETE } },
      { name: 'Qual complemento para seu sundae?', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Leite ninho',             priceAdd: 0,   order: 0 },
          { name: 'Ovomaltine',              priceAdd: 0,   order: 1 },
          { name: 'Paçoca',                  priceAdd: 0,   order: 2 },
          { name: 'Amendoim',                priceAdd: 0,   order: 3 },
          { name: 'Castanha de cajú',        priceAdd: 0,   order: 4 },
          { name: 'Creme de Amendoim',       priceAdd: 1.5, order: 5 },
          { name: 'Creme de Avelã',          priceAdd: 1.5, order: 6 },
          { name: 'Skimo',                   priceAdd: 1.5, order: 7 },
          { name: 'Creme morango',           priceAdd: 1.5, order: 8 },
          { name: 'Leitinho',                priceAdd: 1.5, order: 9 },
          { name: 'Nutella',                 priceAdd: 2.5, order: 10 },
          { name: 'Pistache',                priceAdd: 2.5, order: 11 },
          { name: 'Poupa de abacaxi ao vinho', priceAdd: 1.5, order: 12 },
          { name: 'Poupa de frutas amarelas', priceAdd: 1.5, order: 13 },
          { name: 'Poupa de frutas do bosque', priceAdd: 1.5, order: 14 },
          { name: 'Poupa de frutas verdes',  priceAdd: 1.5, order: 15 },
          { name: 'Poupa de maracujá',       priceAdd: 1.5, order: 16 },
          { name: 'Poupa de morango',        priceAdd: 1.5, order: 17 },
          { name: 'Poupa de banana flambada',priceAdd: 1.5, order: 18 },
        ] } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 2,
        options: { create: COBERTURA } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // BIG COPO SORVETE
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Big Copo Sorvete', companyId: c, order: order++, price: 0, category: 'Big Copo Sorvete', imageUrl: IMG.sorvete,
    description: 'Monte seu sorvete com as combinações de sua escolha.',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu sorvete?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 11, order: 0 },
          { name: '400ml', priceAdd: 13, order: 1 },
          { name: '500ml', priceAdd: 15, order: 2 },
        ] } },
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: SABOR_SORVETE } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 2,
        options: { create: COBERTURA } },
      { name: 'Escolha até 2 acompanhamentos', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 2, order: 3,
        options: { create: ACOMPANHAMENTOS_BIG } },
      { name: 'Adicionais extras (opcionais)', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 2, order: 4,
        options: { create: ADICIONAIS_EXTRAS_OPCIONAL } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 5,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // SORVETE DUO
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Sorvete Duo', companyId: c, order: order++, price: 0, category: 'Sorvete Duo', imageUrl: IMG.sorvete,
    description: 'Sorvete com 2 cremes para criar sua combinação favorita.',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu sorvete Duo?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 14, order: 0 },
          { name: '400ml', priceAdd: 16, order: 1 },
          { name: '500ml', priceAdd: 18, order: 2 },
        ] } },
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: SABOR_SORVETE } },
      { name: 'Escolha até dois Cremes', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 2, order: 2,
        options: { create: [
          { name: 'Brigadeiro',             priceAdd: 0,   order: 0 },
          { name: 'Creme de avelã',         priceAdd: 0,   order: 1 },
          { name: 'Creme de maltovo',       priceAdd: 0,   order: 2 },
          { name: 'Creme de amendoim',      priceAdd: 0,   order: 3 },
          { name: 'Creme de leitinho',      priceAdd: 0,   order: 4 },
          { name: 'Creme de cookies branco',priceAdd: 0,   order: 5 },
          { name: 'Ganache chocolate',      priceAdd: 0,   order: 6 },
          { name: 'Caramelo',              priceAdd: 0,   order: 7 },
          { name: 'Pistache',              priceAdd: 1.5, order: 8 },
          { name: 'Creme de ovomaltine',    priceAdd: 1.5, order: 9 },
          { name: 'Nutella',               priceAdd: 1.5, order: 10 },
          { name: 'Creme de morango',       priceAdd: 0,   order: 11 },
        ] } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 3,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // CASCAS
  // ══════════════════════════════════════════════════════════════════════════
  const TRUFA_CASCA = [
    { name: 'Brigadeiro',           priceAdd: 1, order: 0 },
    { name: 'Skimo',                priceAdd: 1, order: 1 },
    { name: 'Brigadeiro Chocoball', priceAdd: 2, order: 2 },
    { name: 'Brigadeiro Granulado', priceAdd: 2, order: 3 },
    { name: 'Brigadeiro Amendoim',  priceAdd: 2, order: 4 },
    { name: 'Brigadeiro Ovomaltine',priceAdd: 2, order: 5 },
    { name: 'Creme de Leitinho',    priceAdd: 2, order: 6 },
    { name: 'Creme de Amendoim',    priceAdd: 2, order: 7 },
    { name: 'Creme de Avelã',       priceAdd: 2, order: 8 },
    { name: 'Caramelo',             priceAdd: 2, order: 9 },
    { name: 'Nutella',              priceAdd: 3, order: 10 },
    { name: 'Pistache',             priceAdd: 3, order: 11 },
    { name: 'Creme de Ovomaltine',  priceAdd: 3, order: 12 },
  ]

  await prisma.product.create({ data: {
    name: 'Casquinha', companyId: c, order: order++, price: 5, category: 'Cascas', imageUrl: IMG.sorvete_cone,
    optionGroups: { create: [
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: SABOR_SORVETE } },
      { name: 'Deseja trufar sua casca?', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 1, order: 1,
        options: { create: TRUFA_CASCA } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 2,
        options: { create: COBERTURA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Cascão', companyId: c, order: order++, price: 6, category: 'Cascas', imageUrl: IMG.sorvete_cone,
    optionGroups: { create: [
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: SABOR_SORVETE } },
      { name: 'Deseja trufar sua casca?', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 1, order: 1,
        options: { create: TRUFA_CASCA } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 2,
        options: { create: COBERTURA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Cestinha', companyId: c, order: order++, price: 8, category: 'Cascas', imageUrl: IMG.sorvete_cone,
    optionGroups: { create: [
      { name: 'Escolha o sabor do seu sorvete', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: SABOR_SORVETE } },
      { name: 'Alguma cobertura?', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, order: 1,
        options: { create: COBERTURA } },
      { name: 'Adicione 1 complemento', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 1, order: 2,
        options: { create: [
          { name: 'Amendoim',          priceAdd: 0, order: 0 },
          { name: 'Ovomaltine',        priceAdd: 0, order: 1 },
          { name: 'Leite Ninho',       priceAdd: 0, order: 2 },
          { name: 'Paçoca',            priceAdd: 0, order: 3 },
          { name: 'Confete',           priceAdd: 0, order: 4 },
          { name: 'Chocoball',         priceAdd: 0, order: 5 },
          { name: 'Gotas de chocolate',priceAdd: 0, order: 6 },
          { name: 'Skimo',             priceAdd: 0, order: 7 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // MIX FRUTA
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Mix Fruta', companyId: c, order: order++, price: 0, category: 'Mix Fruta', imageUrl: IMG.fruta,
    description: 'Sorvete com polpa de fruta.',
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu Mix Fruta?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 11, order: 0 },
          { name: '400ml', priceAdd: 13, order: 1 },
          { name: '500ml', priceAdd: 15, order: 2 },
        ] } },
      { name: 'Qual sabor do seu Mix fruta?', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 2, order: 1,
        options: { create: [
          { name: 'Abacaxi ao vinho',  priceAdd: 0, order: 0 },
          { name: 'Frutas amarelas',   priceAdd: 0, order: 1 },
          { name: 'Frutas do bosque',  priceAdd: 0, order: 2 },
          { name: 'Frutas verdes',     priceAdd: 0, order: 3 },
          { name: 'Maracuja',          priceAdd: 0, order: 4 },
          { name: 'Morango',           priceAdd: 0, order: 5 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // MILK SHAKE
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Milk Shake Tradicional', companyId: c, order: order++, price: 0, category: 'Milk Shake', imageUrl: IMG.milkshake,
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu Milk Shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 10, order: 0 },
          { name: '400ml', priceAdd: 12, order: 1 },
          { name: '500ml', priceAdd: 14, order: 2 },
        ] } },
      { name: 'Qual o sabor de seu Milk Shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Abacaxi',            priceAdd: 0, order: 0 },
          { name: 'Banana',             priceAdd: 0, order: 1 },
          { name: 'Blue Ice',           priceAdd: 0, order: 2 },
          { name: 'Chiclete',           priceAdd: 0, order: 3 },
          { name: 'Chocolate',          priceAdd: 0, order: 4 },
          { name: 'Chocolate Black',    priceAdd: 0, order: 5 },
          { name: 'Chocolate Branco',   priceAdd: 0, order: 6 },
          { name: 'Coco Queimado',      priceAdd: 0, order: 7 },
          { name: 'Coco Branco',        priceAdd: 0, order: 8 },
          { name: 'Flocos',             priceAdd: 0, order: 9 },
          { name: 'Leite Condensado',   priceAdd: 0, order: 10 },
          { name: 'Morango',            priceAdd: 0, order: 11 },
          { name: 'Ovomaltine',         priceAdd: 0, order: 12 },
          { name: 'Ovomaltine Baunilha',priceAdd: 0, order: 13 },
          { name: 'Ovomaltine black',   priceAdd: 0, order: 14 },
          { name: 'Paçoca',             priceAdd: 0, order: 15 },
        ] } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Milk Shake Premium', companyId: c, order: order++, price: 0, category: 'Milk Shake', imageUrl: IMG.milkshake,
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu Milk Shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 11, order: 0 },
          { name: '400ml', priceAdd: 13, order: 1 },
          { name: '500ml', priceAdd: 15, order: 2 },
        ] } },
      { name: 'Qual sabor do seu milk shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Abacaxi ao vinho',               priceAdd: 0, order: 0 },
          { name: 'Banana com canela',              priceAdd: 0, order: 1 },
          { name: 'Banana com ninho',               priceAdd: 0, order: 2 },
          { name: 'Bombom Beijinho',                priceAdd: 0, order: 3 },
          { name: 'Chocobis',                       priceAdd: 0, order: 4 },
          { name: 'Choconinho',                     priceAdd: 0, order: 5 },
          { name: 'Leite ninho',                    priceAdd: 0, order: 6 },
          { name: 'Duplo Ovomaltine',               priceAdd: 0, order: 7 },
          { name: 'Duplo Ovomaltine baunilha',      priceAdd: 0, order: 8 },
          { name: 'Duplo Ovomaltine black',         priceAdd: 0, order: 9 },
          { name: 'Limão',                          priceAdd: 0, order: 10 },
          { name: 'Maracuja',                       priceAdd: 0, order: 11 },
          { name: 'Morango com Ninho',              priceAdd: 0, order: 12 },
          { name: 'Oreo',                           priceAdd: 0, order: 13 },
          { name: 'Ouro branco',                    priceAdd: 0, order: 14 },
          { name: 'Ovoninho',                       priceAdd: 0, order: 15 },
          { name: 'Sensação (morango com chocolate)',priceAdd: 0, order: 16 },
          { name: 'Sonho de valsa',                 priceAdd: 0, order: 17 },
        ] } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Milk Shake Especial', companyId: c, order: order++, price: 0, category: 'Milk Shake', imageUrl: IMG.milkshake,
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu Milk Shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 15, order: 0 },
          { name: '400ml', priceAdd: 19, order: 1 },
          { name: '500ml', priceAdd: 22, order: 2 },
        ] } },
      { name: 'Qual o sabor do seu milk shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Caramelo',             priceAdd: 0, order: 0 },
          { name: 'Leitinho',             priceAdd: 0, order: 1 },
          { name: 'Morango com nutella',  priceAdd: 0, order: 2 },
          { name: 'Nutella',              priceAdd: 0, order: 3 },
          { name: 'Nutella com Ninho',    priceAdd: 0, order: 4 },
          { name: 'Nutella com Ovomaltine', priceAdd: 0, order: 5 },
          { name: 'Pistache',             priceAdd: 0, order: 6 },
          { name: 'Pistache com castanha',priceAdd: 0, order: 7 },
        ] } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Café Shake', companyId: c, order: order++, price: 0, category: 'Milk Shake', imageUrl: IMG.milkshake,
    optionGroups: { create: [
      { name: 'Qual o tamanho do seu Milk Shake?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: '300ml', priceAdd: 11, order: 0 },
          { name: '400ml', priceAdd: 13, order: 1 },
          { name: '500ml', priceAdd: 15, order: 2 },
        ] } },
      { name: 'Escolha o sabor do seu café shake', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 1,
        options: { create: [
          { name: 'Cappuccino',          priceAdd: 0, order: 0 },
          { name: 'Cappuccino Baunilha', priceAdd: 0, order: 1 },
          { name: 'Cappuccino Chocolate',priceAdd: 0, order: 2 },
          { name: 'Café',                priceAdd: 0, order: 3 },
          { name: 'Café com Ninho',      priceAdd: 0, order: 4 },
          { name: 'Café com Canela',     priceAdd: 0, order: 5 },
          { name: 'Café com Banana',     priceAdd: 0, order: 6 },
          { name: 'Café com Nutella',    priceAdd: 0, order: 7 },
          { name: 'Chocolate Black café',priceAdd: 0, order: 8 },
          { name: 'Café 100% Arábica',   priceAdd: 0, order: 9 },
          { name: 'Café com Caramelo',   priceAdd: 0, order: 10 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // PICOLÉS
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Picolé base fruta', companyId: c, order: order++, price: 0, category: 'Picolés', imageUrl: IMG.picole,
    description: 'Picolés de fruta sem leite e derivados. Zero gluten, zero lactose, zero saborizante industrial.',
    optionGroups: { create: [
      { name: 'Base Fruta', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 20, order: 0,
        options: { create: [
          { name: 'Morango fruta', priceAdd: 5, order: 0 },
          { name: 'Tamarindo',     priceAdd: 5, order: 1 },
          { name: 'Maracujá',      priceAdd: 5, order: 2 },
          { name: 'Limão',         priceAdd: 5, order: 3 },
          { name: 'Cajá',          priceAdd: 5, order: 4 },
          { name: 'Uva',           priceAdd: 5, order: 5 },
        ] } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Picolé base leite', companyId: c, order: order++, price: 0, category: 'Picolés', imageUrl: IMG.picole,
    description: 'Picolé base leite. Contém lactose.',
    optionGroups: { create: [
      { name: 'Picolé base leite', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 20, order: 0,
        options: { create: [
          { name: 'Blue ice',                    priceAdd: 3, order: 0 },
          { name: 'Coco',                        priceAdd: 3, order: 1 },
          { name: 'Coco queimado',               priceAdd: 3, order: 2 },
          { name: 'Leite condensado',            priceAdd: 3, order: 3 },
          { name: 'Flocos',                      priceAdd: 3, order: 4 },
          { name: 'Chocolate',                   priceAdd: 3, order: 5 },
          { name: 'Sensação',                    priceAdd: 3, order: 6 },
          { name: 'Leite ninho',                 priceAdd: 3, order: 7 },
          { name: 'Pistache',                    priceAdd: 3, order: 8 },
          { name: 'Chocomenta',                  priceAdd: 3, order: 9 },
          { name: 'Skimo',                       priceAdd: 6, order: 10 },
          { name: 'Skimo chocolate',             priceAdd: 6, order: 11 },
          { name: 'Morango com leite condensado',priceAdd: 6, order: 12 },
          { name: 'Ninho trufado',               priceAdd: 6, order: 13 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // POTES
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Potes (2L)', companyId: c, order: order++, price: 45, category: 'Potes', imageUrl: IMG.pote,
    optionGroups: { create: [
      { name: 'Qual sabor do pote?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'Açaí com creme de leitinho 2L', priceAdd: 0, order: 0 },
          { name: 'Açaí Tradicional 2L',           priceAdd: 0, order: 1 },
        ] } },
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 1,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Pote de 300ml', companyId: c, order: order++, price: 14, category: 'Potes', imageUrl: IMG.pote,
    optionGroups: { create: [
      { name: 'Sabores', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'Flocos',            priceAdd: 0, order: 0 },
          { name: 'Coco',              priceAdd: 0, order: 1 },
          { name: 'Ovoninho',          priceAdd: 0, order: 2 },
          { name: 'Leite condensado',  priceAdd: 0, order: 3 },
          { name: 'Negresco',          priceAdd: 0, order: 4 },
          { name: 'Chocolate branco',  priceAdd: 0, order: 5 },
        ] } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Pote de açaí 300ml zero', companyId: c, order: order++, price: 15, category: 'Potes', imageUrl: IMG.acai,
    optionGroups: { create: [
      { name: 'Adicionais separados', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 20, order: 0,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // CONVENIÊNCIA
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Bebidas', companyId: c, order: order++, price: 0, category: 'Conveniência', imageUrl: IMG.bebida,
    optionGroups: { create: [
      { name: 'Algo para beber?', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 10, order: 0,
        options: { create: [
          { name: 'Coca cola lata',          priceAdd: 5, order: 0 },
          { name: 'Fanta laranja lata',       priceAdd: 5, order: 1 },
          { name: 'Guaraná antarctica lata',  priceAdd: 5, order: 2 },
          { name: 'Água mineral',             priceAdd: 3, order: 3 },
          { name: 'Água com gás',             priceAdd: 4, order: 4 },
        ] } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Baleiro', companyId: c, order: order++, price: 0, category: 'Conveniência', imageUrl: IMG.complemento,
    optionGroups: { create: [
      { name: 'Algo para acompanhar seu pedido?', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 10, order: 0,
        options: { create: [
          { name: 'Halls cereja',      priceAdd: 3, order: 0 },
          { name: 'Halls extra forte', priceAdd: 3, order: 1 },
          { name: 'Halls menta',       priceAdd: 3, order: 2 },
          { name: 'Halls morango',     priceAdd: 3, order: 3 },
          { name: 'Trident hortelã',   priceAdd: 3, order: 4 },
          { name: 'Trident menta',     priceAdd: 3, order: 5 },
          { name: 'Trident morango',   priceAdd: 3, order: 6 },
          { name: 'Trident tutti-frutti', priceAdd: 3, order: 7 },
        ] } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // DIVERSOS
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Potes de complemento', companyId: c, order: order++, price: 0, category: 'Diversos', imageUrl: IMG.complemento,
    description: 'Adicionais separados por pote para completar seu pedido.',
    optionGroups: { create: [
      { name: 'Adicionais separados', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 20, order: 0,
        options: { create: ADICIONAIS_SEPARADOS } },
    ] },
  } })

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPORADA DE FRIO
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.product.create({ data: {
    name: 'Chocolate Quente', companyId: c, order: order++, price: 18, category: 'Temporada de Frio', imageUrl: IMG.chocolate_q,
    description: 'Feito com chocolate de verdade, nosso chocolate quente tem sabor intenso, textura cremosa e uma experiência única em cada gole.',
    optionGroups: { create: [
      { name: 'Adicionais', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 8, order: 0,
        options: { create: ADICIONAIS_TEMPORADA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Brownie', companyId: c, order: order++, price: 12, category: 'Temporada de Frio', imageUrl: IMG.brownie,
    description: 'Brownie macio e intenso no chocolate, servido individualmente.',
    optionGroups: { create: [
      { name: 'Calda por cima?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'Com calda ✔', priceAdd: 0, order: 0 },
          { name: 'Sem calda ❌', priceAdd: 0, order: 1 },
        ] } },
      { name: 'Adicionais', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 8, order: 1,
        options: { create: ADICIONAIS_TEMPORADA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Brownie com sorvete', companyId: c, order: order++, price: 17.99, category: 'Temporada de Frio', imageUrl: IMG.brownie,
    description: 'Brownie acompanhado de sorvete de creme, feito com ingredientes selecionados. Finalizado com uma leve camada de calda.',
    optionGroups: { create: [
      { name: 'Calda por cima?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'Com calda ✔', priceAdd: 0, order: 0 },
          { name: 'Sem calda ❌', priceAdd: 0, order: 1 },
        ] } },
      { name: 'Adicionais', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 8, order: 1,
        options: { create: ADICIONAIS_TEMPORADA } },
    ] },
  } })

  await prisma.product.create({ data: {
    name: 'Chocolate quente com brownie', companyId: c, order: order++, price: 27.99, category: 'Temporada de Frio', imageUrl: IMG.chocolate_q,
    description: 'Chocolate quente intenso e cremoso, feito com chocolate de verdade, acompanhado de brownie com uma leve camada de calda.',
    optionGroups: { create: [
      { name: 'Calda por cima?', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1, order: 0,
        options: { create: [
          { name: 'Com calda ✔', priceAdd: 0, order: 0 },
          { name: 'Sem calda ❌', priceAdd: 0, order: 1 },
        ] } },
      { name: 'Adicionais', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 8, order: 1,
        options: { create: ADICIONAIS_TEMPORADA } },
    ] },
  } })

  console.log(`✅ ${order} produtos criados`)
  console.log('\n🎉 Seed concluído!')
  console.log('\n📋 Credenciais:')
  console.log(`  Dono da loja: ${OWNER_EMAIL} / loja123`)
  console.log(`  Loja: https://<seu-domínio>/${CITY_SLUG}/sabore-acaiteria-campo-alegre`)
  console.log('\n⚠️  Lembre de atualizar phone, whatsapp, e pixKey no painel admin.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
