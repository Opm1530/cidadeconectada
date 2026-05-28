import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const IMG = {
  c_burger:     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&fit=crop',
  c_pizza:      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&fit=crop',
  c_mercado:    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80&fit=crop',
  c_padaria:    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&fit=crop',
  c_acai:       'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80&fit=crop',
  c_farmacia:   'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&q=80&fit=crop',
  c_sushi:      'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80&fit=crop',
  c_pet:        'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=800&q=80&fit=crop',
  c_sorvete:    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80&fit=crop',
  c_churrasco:  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80&fit=crop',
  p_xburger:    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop',
  p_bacon:      'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80&fit=crop',
  p_fries:      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80&fit=crop',
  p_shake:      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop',
  p_margherita: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80&fit=crop',
  p_pepperoni:  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop',
  p_pao:        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop',
  p_croissant:  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80&fit=crop',
  p_acai:       'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80&fit=crop',
  p_sushi:      'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80&fit=crop',
  p_nigiri:     'https://images.unsplash.com/photo-1563612116891-8e0e5ead1c5f?w=600&q=80&fit=crop',
  p_dogfood:    'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&q=80&fit=crop',
  p_dogtoy:     'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&q=80&fit=crop',
  p_chicken:    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80&fit=crop',
  p_salad:      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&q=80&fit=crop',
  p_sorvete:    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80&fit=crop',
  p_porcao:     'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80&fit=crop',
}

// Horário padrão: seg-sex 08-22, sab 08-20, dom fechado
const HOURS_RESTAURANTE = {
  mon: { open: '11:00', close: '23:00' },
  tue: { open: '11:00', close: '23:00' },
  wed: { open: '11:00', close: '23:00' },
  thu: { open: '11:00', close: '23:00' },
  fri: { open: '11:00', close: '00:00' },
  sat: { open: '11:00', close: '00:00' },
  sun: { open: '11:00', close: '22:00' },
}
const HOURS_COMERCIO = {
  mon: { open: '08:00', close: '20:00' },
  tue: { open: '08:00', close: '20:00' },
  wed: { open: '08:00', close: '20:00' },
  thu: { open: '08:00', close: '20:00' },
  fri: { open: '08:00', close: '20:00' },
  sat: { open: '08:00', close: '18:00' },
  sun: null,
}
const HOURS_PADARIA = {
  mon: { open: '06:00', close: '20:00' },
  tue: { open: '06:00', close: '20:00' },
  wed: { open: '06:00', close: '20:00' },
  thu: { open: '06:00', close: '20:00' },
  fri: { open: '06:00', close: '20:00' },
  sat: { open: '06:00', close: '18:00' },
  sun: { open: '07:00', close: '12:00' },
}
const HOURS_FARMACIA = {
  mon: { open: '07:00', close: '22:00' },
  tue: { open: '07:00', close: '22:00' },
  wed: { open: '07:00', close: '22:00' },
  thu: { open: '07:00', close: '22:00' },
  fri: { open: '07:00', close: '22:00' },
  sat: { open: '08:00', close: '20:00' },
  sun: { open: '08:00', close: '14:00' },
}

type SimpleProduct = {
  name: string
  description: string
  price: number
  order: number
  category?: string
  imageUrl?: string
}

// Limpa produtos com segurança (deleta OrderItems antes)
async function clearProducts(companyId: string) {
  const existing = await prisma.product.findMany({ where: { companyId }, select: { id: true } })
  const ids = existing.map(p => p.id)
  if (ids.length > 0) {
    await prisma.orderItem.deleteMany({ where: { productId: { in: ids } } })
  }
  await prisma.product.deleteMany({ where: { companyId } })
}

// Cria produtos simples um a um (createMany tem bug com Decimal no Prisma)
async function createProducts(companyId: string, products: SimpleProduct[]) {
  await clearProducts(companyId)
  for (const p of products) {
    await prisma.product.create({ data: { ...p, companyId } })
  }
}

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Super Admin ────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@cidadeconectada.com.br' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@cidadeconectada.com.br',
      password: await hash('admin123', 12),
      role: Role.SUPER_ADMIN,
    },
  })
  console.log('✅ Super Admin')

  // ── Cidade ─────────────────────────────────────────────────────────────
  const city = await prisma.city.upsert({
    where: { slug: 'cidade-exemplo' },
    update: {},
    create: {
      name: 'Cidade Exemplo',
      state: 'SP',
      slug: 'cidade-exemplo',
      active: true,
      freeCompanyRegistration: true,
    },
  })
  console.log('✅ Cidade:', city.name)

  // ── Admin da Cidade ────────────────────────────────────────────────────
  const cityAdminUser = await prisma.user.upsert({
    where: { email: 'admin@cidade-exemplo.com.br' },
    update: {},
    create: {
      name: 'Admin Cidade Exemplo',
      email: 'admin@cidade-exemplo.com.br',
      password: await hash('admin123', 12),
      role: Role.CITY_ADMIN,
      cityId: city.id,
    },
  })
  await prisma.cityAdmin.upsert({
    where: { userId_cityId: { userId: cityAdminUser.id, cityId: city.id } },
    update: {},
    create: { userId: cityAdminUser.id, cityId: city.id },
  })
  console.log('✅ Admin:', cityAdminUser.email)

  // ── Bairros ────────────────────────────────────────────────────────────
  for (const nome of ['Centro', 'Jardim América', 'Vila Nova', 'São João', 'Bela Vista', 'Parque das Flores']) {
    await prisma.neighborhood.upsert({
      where: { name_cityId: { name: nome, cityId: city.id } },
      update: {},
      create: { name: nome, cityId: city.id },
    })
  }
  console.log('✅ Bairros')

  // ── Helper: cria owner + empresa ──────────────────────────────────────
  async function upsertCompany(
    ownerEmail: string,
    ownerName: string,
    data: {
      name: string; slug: string; description: string; category: string
      coverUrl?: string; phone: string; whatsapp: string
      acceptsPix?: boolean; pixKey?: string
      acceptsCashOnDelivery?: boolean; acceptsPlatformDrivers?: boolean
      hasOwnDelivery?: boolean; ownDeliveryFee?: number
      acceptsMercadoPago?: boolean
      openingHours?: object
    },
  ) {
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        name: ownerName, email: ownerEmail,
        password: await hash('loja123', 12),
        role: Role.COMPANY_OWNER, cityId: city.id,
      },
    })
    return prisma.company.upsert({
      where: { slug: data.slug },
      update: { openingHours: data.openingHours ?? null },
      create: { ...data, cityId: city.id, ownerId: owner.id, active: true },
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. LANCHONETE DO JOÃO
  // ══════════════════════════════════════════════════════════════════════
  const lanchonete = await upsertCompany('loja@exemplo.com.br', 'João da Loja', {
    name: 'Lanchonete do João', slug: 'lanchonete-do-joao',
    description: 'Os melhores lanches artesanais da cidade, feitos na hora!',
    category: 'Lanchonete', phone: '(11) 99999-0001', whatsapp: '11999990001',
    coverUrl: IMG.c_burger,
    acceptsPix: true, pixKey: '11999990001',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    hasOwnDelivery: true, ownDeliveryFee: 5,
    openingHours: HOURS_RESTAURANTE,
  })

  await clearProducts(lanchonete.id)
  await prisma.product.create({
    data: {
      name: 'X-Burguer Especial', order: 0, imageUrl: IMG.p_xburger, companyId: lanchonete.id,
      category: 'Lanches',
      description: 'Hambúrguer artesanal 180g, queijo, alface, tomate e molho especial',
      price: 25.9,
      optionGroups: {
        create: [
          { name: 'Ponto da Carne', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1,
            options: { create: [{ name: 'Mal passado', priceAdd: 0, order: 0 }, { name: 'Ao ponto', priceAdd: 0, order: 1 }, { name: 'Bem passado', priceAdd: 0, order: 2 }] } },
          { name: 'Adicionais', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 5,
            options: { create: [{ name: 'Bacon', priceAdd: 3, order: 0 }, { name: 'Queijo extra', priceAdd: 2, order: 1 }, { name: 'Ovo', priceAdd: 2.5, order: 2 }, { name: 'Catupiry', priceAdd: 3, order: 3 }] } },
        ],
      },
    },
  })
  await createProducts(lanchonete.id, [
    { name: 'X-Bacon Duplo', description: 'Dois hambúrgueres 150g, muito bacon e cheddar derretido', price: 34.9, order: 1, category: 'Lanches', imageUrl: IMG.p_bacon },
    { name: 'Frango Grelhado', description: 'Sanduíche de frango grelhado com alface e tomate', price: 22.9, order: 2, category: 'Lanches', imageUrl: IMG.p_chicken },
    { name: 'Salada Caesar', description: 'Alface romana, croutons, parmesão e molho caesar', price: 18.9, order: 3, category: 'Lanches', imageUrl: IMG.p_salad },
    { name: 'Batata Frita G', description: 'Porção grande de batata palito crocante com molho', price: 14.9, order: 4, category: 'Acompanhamentos', imageUrl: IMG.p_fries },
    { name: 'Batata Frita P', description: 'Porção pequena de batata palito', price: 9.9, order: 5, category: 'Acompanhamentos', imageUrl: IMG.p_fries },
    { name: 'Combo Família', description: '4 X-Burguer + 2 Batatas G + 4 Refrigerantes', price: 89.9, order: 6, category: 'Combos' },
    { name: 'Milk Shake Chocolate', description: 'Milk shake cremoso de chocolate belga — 400ml', price: 16.9, order: 7, category: 'Bebidas', imageUrl: IMG.p_shake },
    { name: 'Milk Shake Morango', description: 'Milk shake cremoso de morango natural — 400ml', price: 16.9, order: 8, category: 'Bebidas', imageUrl: IMG.p_shake },
    { name: 'Refrigerante Lata', description: 'Coca-Cola, Guaraná, Sprite ou Fanta — 350ml', price: 6, order: 9, category: 'Bebidas' },
    { name: 'Suco Natural', description: 'Laranja, limão ou maracujá — 300ml', price: 8.9, order: 10, category: 'Bebidas' },
  ])
  console.log('✅ Lanchonete do João (11 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 2. PIZZARIA BELLA NAPOLI
  // ══════════════════════════════════════════════════════════════════════
  const pizzaria = await upsertCompany('bella@napoli.com.br', 'Maria Napoli', {
    name: 'Pizzaria Bella Napoli', slug: 'pizzaria-bella-napoli',
    description: 'Pizzas artesanais com massa fermentada 72h e ingredientes importados',
    category: 'Pizzaria', phone: '(11) 99999-0002', whatsapp: '11999990002',
    coverUrl: IMG.c_pizza,
    acceptsPix: true, pixKey: '11999990002',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    hasOwnDelivery: true, ownDeliveryFee: 7,
    openingHours: { ...HOURS_RESTAURANTE, mon: null }, // fechado segunda
  })
  await clearProducts(pizzaria.id)
  await prisma.product.create({
    data: {
      name: 'Pizza Margherita', description: 'Molho de tomate San Marzano, mussarela de búfala e manjericão fresco',
      price: 49.9, order: 0, imageUrl: IMG.p_margherita, companyId: pizzaria.id,
      category: 'Pizzas Tradicionais',
      optionGroups: {
        create: [
          { name: 'Tamanho', type: 'SINGLE', required: true, minSelect: 1, maxSelect: 1,
            options: { create: [{ name: 'Broto (4 fatias)', priceAdd: -10, order: 0 }, { name: 'Média (6 fatias)', priceAdd: 0, order: 1 }, { name: 'Grande (8 fatias)', priceAdd: 12, order: 2 }] } },
          { name: 'Borda recheada', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1,
            options: { create: [{ name: 'Catupiry', priceAdd: 8, order: 0 }, { name: 'Cheddar', priceAdd: 8, order: 1 }, { name: 'Sem borda', priceAdd: 0, order: 2 }] } },
        ],
      },
    },
  })
  await createProducts(pizzaria.id, [
    { name: 'Pizza Pepperoni', description: 'Molho especial, mussarela e farto pepperoni importado', price: 55.9, order: 1, category: 'Pizzas Tradicionais', imageUrl: IMG.p_pepperoni },
    { name: 'Pizza Portuguesa', description: 'Presunto, ovos, cebola, azeitona e mussarela', price: 52.9, order: 2, category: 'Pizzas Tradicionais', imageUrl: IMG.p_margherita },
    { name: 'Pizza Quatro Queijos', description: 'Mussarela, gorgonzola, parmesão e catupiry', price: 58.9, order: 3, category: 'Pizzas Tradicionais', imageUrl: IMG.p_margherita },
    { name: 'Pizza Frango c/ Catupiry', description: 'Frango desfiado temperado, catupiry e milho', price: 53.9, order: 4, category: 'Pizzas Tradicionais', imageUrl: IMG.p_pepperoni },
    { name: 'Pizza Chocolate c/ Morango', description: 'Massa doce, chocolate ao leite e morangos frescos', price: 47.9, order: 5, category: 'Pizzas Doces', imageUrl: IMG.p_margherita },
    { name: 'Esfiha Aberta (6 un)', description: 'Esfihas abertas recheadas de carne, queijo ou mista', price: 24.9, order: 6, category: 'Petiscos' },
    { name: 'Calzone de Frango', description: 'Massa fechada recheada com frango e requeijão', price: 32.9, order: 7, category: 'Petiscos' },
    { name: 'Refrigerante 2L', description: 'Coca-Cola, Guaraná ou Suco — 2 litros', price: 12.9, order: 8, category: 'Bebidas' },
  ])
  console.log('✅ Pizzaria Bella Napoli (9 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 3. MERCADO CENTRAL
  // ══════════════════════════════════════════════════════════════════════
  const mercado = await upsertCompany('mercado@central.com.br', 'Carlos Mercado', {
    name: 'Mercado Central', slug: 'mercado-central',
    description: 'Tudo que você precisa sem sair de casa. Hortifrúti, laticínios, carnes e mais.',
    category: 'Mercado', phone: '(11) 99999-0003', whatsapp: '11999990003',
    coverUrl: IMG.c_mercado,
    acceptsPix: true, pixKey: '11999990003',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    hasOwnDelivery: true, ownDeliveryFee: 6,
    openingHours: HOURS_COMERCIO,
  })
  await createProducts(mercado.id, [
    { name: 'Arroz Tipo 1 (5kg)', description: 'Arroz branco longo fino — 5kg', price: 22.9, order: 0, category: 'Grãos & Cereais' },
    { name: 'Feijão Carioca (1kg)', description: 'Feijão carioca selecionado — 1kg', price: 9.9, order: 1, category: 'Grãos & Cereais' },
    { name: 'Óleo de Soja (900ml)', description: 'Óleo de soja refinado — 900ml', price: 7.9, order: 2, category: 'Grãos & Cereais' },
    { name: 'Açúcar Cristal (1kg)', description: 'Açúcar cristal especial — 1kg', price: 5.9, order: 3, category: 'Grãos & Cereais' },
    { name: 'Leite Integral (1L)', description: 'Leite integral UHT longa vida — 1L', price: 4.9, order: 4, category: 'Laticínios' },
    { name: 'Pão de Forma (500g)', description: 'Pão de forma macio e fatiado — 500g', price: 8.9, order: 5, category: 'Padaria', imageUrl: IMG.p_pao },
    { name: 'Frango Inteiro (kg)', description: 'Frango resfriado inteiro, por kg', price: 14.9, order: 6, category: 'Carnes', imageUrl: IMG.p_chicken },
    { name: 'Carne Moída (500g)', description: 'Carne bovina moída — 500g', price: 18.9, order: 7, category: 'Carnes' },
    { name: 'Ovos (dúzia)', description: 'Ovos brancos ou caipiras — 12 unidades', price: 13.9, order: 8, category: 'Laticínios' },
    { name: 'Cerveja Lata (350ml)', description: 'Brahma, Skol ou Itaipava — lata 350ml', price: 4.5, order: 9, category: 'Bebidas' },
    { name: 'Refrigerante 2L', description: 'Coca-Cola, Pepsi ou Guaraná — 2L', price: 10.9, order: 10, category: 'Bebidas' },
    { name: 'Detergente (500ml)', description: 'Detergente líquido concentrado — 500ml', price: 3.9, order: 11, category: 'Limpeza' },
  ])
  console.log('✅ Mercado Central (12 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 4. PADARIA DOIS IRMÃOS
  // ══════════════════════════════════════════════════════════════════════
  const padaria = await upsertCompany('padaria@doisirmaos.com.br', 'Ana Padeira', {
    name: 'Padaria Dois Irmãos', slug: 'padaria-dois-irmaos',
    description: 'Pães e doces fresquinhos todo dia, desde 1987.',
    category: 'Padaria', phone: '(11) 99999-0004', whatsapp: '11999990004',
    coverUrl: IMG.c_padaria,
    acceptsPix: true, pixKey: '11999990004',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    openingHours: HOURS_PADARIA,
  })
  await createProducts(padaria.id, [
    { name: 'Pão Francês (kg)', description: 'Pão francês fresquinho saído do forno — por quilo', price: 18.9, order: 0, category: 'Pães', imageUrl: IMG.p_pao },
    { name: 'Croissant de Manteiga', description: 'Croissant folhado com manteiga francesa', price: 8.9, order: 1, category: 'Pães', imageUrl: IMG.p_croissant },
    { name: 'Croissant de Chocolate', description: 'Croissant folhado recheado com ganache de chocolate', price: 9.9, order: 2, category: 'Pães', imageUrl: IMG.p_croissant },
    { name: 'Pão de Queijo (6 un)', description: 'Pão de queijo mineiro quentinho — 6 unidades', price: 14.9, order: 3, category: 'Salgados' },
    { name: 'Coxinha (un)', description: 'Coxinha de frango com requeijão — unidade', price: 6.9, order: 4, category: 'Salgados' },
    { name: 'Esfiha de Carne (un)', description: 'Esfiha fechada de carne temperada', price: 5.9, order: 5, category: 'Salgados' },
    { name: 'Bolo de Cenoura', description: 'Fatia generosa de bolo de cenoura com cobertura de chocolate', price: 9.9, order: 6, category: 'Doces & Bolos' },
    { name: 'Café com Leite (300ml)', description: 'Café coado com leite quentinho', price: 6.9, order: 7, category: 'Bebidas' },
    { name: 'Cappuccino (300ml)', description: 'Cappuccino cremoso com canela', price: 8.9, order: 8, category: 'Bebidas' },
    { name: 'Vitamina de Frutas (400ml)', description: 'Vitamina de banana, maçã e leite', price: 12.9, order: 9, category: 'Bebidas' },
  ])
  console.log('✅ Padaria Dois Irmãos (10 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 5. AÇAÍ DO PARQUE
  // ══════════════════════════════════════════════════════════════════════
  const acai = await upsertCompany('acai@parque.com.br', 'Pedro Açaí', {
    name: 'Açaí do Parque', slug: 'acai-do-parque',
    description: 'Açaí paraense de verdade, com mais de 30 complementos.',
    category: 'Açaí', phone: '(11) 99999-0005', whatsapp: '11999990005',
    coverUrl: IMG.c_acai,
    acceptsPix: true, pixKey: '11999990005',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    openingHours: {
      mon: { open: '10:00', close: '22:00' },
      tue: { open: '10:00', close: '22:00' },
      wed: { open: '10:00', close: '22:00' },
      thu: { open: '10:00', close: '22:00' },
      fri: { open: '10:00', close: '23:00' },
      sat: { open: '10:00', close: '23:00' },
      sun: { open: '11:00', close: '21:00' },
    },
  })
  await clearProducts(acai.id)
  await prisma.product.create({
    data: {
      name: 'Açaí 500ml', description: 'Açaí puro paraense na tigela — 500ml',
      price: 19.9, order: 0, imageUrl: IMG.p_acai, companyId: acai.id,
      category: 'Açaís',
      optionGroups: {
        create: [{ name: 'Complementos (até 5)', type: 'MULTIPLE', required: false, minSelect: 0, maxSelect: 5,
          options: { create: [
            { name: 'Granola', priceAdd: 0, order: 0 }, { name: 'Leite Condensado', priceAdd: 0, order: 1 },
            { name: 'Banana', priceAdd: 0, order: 2 }, { name: 'Morango', priceAdd: 2, order: 3 },
            { name: 'Paçoca', priceAdd: 1, order: 4 }, { name: 'Nutella', priceAdd: 3, order: 5 },
            { name: 'Bis', priceAdd: 2, order: 6 }, { name: 'Kiwi', priceAdd: 2, order: 7 },
          ] },
        }],
      },
    },
  })
  await createProducts(acai.id, [
    { name: 'Açaí 300ml', description: 'Açaí puro paraense — 300ml', price: 12.9, order: 1, category: 'Açaís', imageUrl: IMG.p_acai },
    { name: 'Açaí 700ml', description: 'Açaí puro paraense — 700ml', price: 26.9, order: 2, category: 'Açaís', imageUrl: IMG.p_acai },
    { name: 'Açaí 1 Litro', description: 'Açaí puro paraense — 1L', price: 34.9, order: 3, category: 'Açaís', imageUrl: IMG.p_acai },
    { name: 'Combo 2 Açaís 500ml', description: 'Dois açaís de 500ml + 10 complementos', price: 35.9, order: 4, category: 'Combos', imageUrl: IMG.p_acai },
    { name: 'Vitamina de Açaí (400ml)', description: 'Vitamina cremosa de açaí com banana e leite de coco', price: 15.9, order: 5, category: 'Bebidas' },
  ])
  console.log('✅ Açaí do Parque (6 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 6. SUSHI HOUSE
  // ══════════════════════════════════════════════════════════════════════
  const sushi = await upsertCompany('sushi@house.com.br', 'Kenji Yamamoto', {
    name: 'Sushi House', slug: 'sushi-house',
    description: 'Culinária japonesa autêntica com salmão fresco importado diariamente.',
    category: 'Sushi', phone: '(11) 99999-0006', whatsapp: '11999990006',
    coverUrl: IMG.c_sushi,
    acceptsPix: true, pixKey: '11999990006',
    acceptsMercadoPago: true, acceptsPlatformDrivers: true,
    hasOwnDelivery: true, ownDeliveryFee: 8,
    openingHours: { ...HOURS_RESTAURANTE, mon: null, tue: null }, // fecha seg e ter
  })
  await createProducts(sushi.id, [
    { name: 'Combinado 16 peças', description: '4 niguiri salmão + 4 uramaki califórnia + 4 hot roll + 4 hossomaki', price: 59.9, order: 0, category: 'Combinados', imageUrl: IMG.p_sushi },
    { name: 'Combinado 30 peças', description: 'Variedade completa para 2 pessoas', price: 99.9, order: 1, category: 'Combinados', imageUrl: IMG.p_sushi },
    { name: 'Niguiri de Salmão (8 un)', description: 'Fatias de salmão fresco sobre arroz temperado', price: 38.9, order: 2, category: 'À La Carte', imageUrl: IMG.p_nigiri },
    { name: 'Temaki de Salmão', description: 'Cone de nori com salmão, cream cheese e pepino', price: 22.9, order: 3, category: 'À La Carte', imageUrl: IMG.p_sushi },
    { name: 'Temaki de Atum', description: 'Cone de nori com atum fresco e avocado', price: 24.9, order: 4, category: 'À La Carte', imageUrl: IMG.p_sushi },
    { name: 'Hot Roll (8 un)', description: 'Uramaki empanado e frito com cream cheese e salmão', price: 32.9, order: 5, category: 'À La Carte', imageUrl: IMG.p_nigiri },
    { name: 'Gyoza (6 un)', description: 'Bolinho japonês frito recheado de carne e vegetais', price: 28.9, order: 6, category: 'Entradas' },
    { name: 'Missoshiro', description: 'Sopa de miso tradicional com tofu e alga wakame', price: 14.9, order: 7, category: 'Entradas' },
    { name: 'Chá Verde Gelado (500ml)', description: 'Chá verde japonês com gengibre', price: 9.9, order: 8, category: 'Bebidas' },
  ])
  console.log('✅ Sushi House (9 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 7. PETSHOP AMIGO FIEL
  // ══════════════════════════════════════════════════════════════════════
  const petshop = await upsertCompany('petshop@amigofiel.com.br', 'Luana Pets', {
    name: 'Petshop Amigo Fiel', slug: 'petshop-amigo-fiel',
    description: 'Tudo para o seu pet: ração, brinquedos, higiene e muito amor.',
    category: 'Petshop', phone: '(11) 99999-0007', whatsapp: '11999990007',
    coverUrl: IMG.c_pet,
    acceptsPix: true, pixKey: '11999990007',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    openingHours: HOURS_COMERCIO,
  })
  await createProducts(petshop.id, [
    { name: 'Ração Cachorro Adulto (3kg)', description: 'Ração premium para cães adultos — 3kg', price: 49.9, order: 0, category: 'Rações', imageUrl: IMG.p_dogfood },
    { name: 'Ração Gato Adulto (1kg)', description: 'Ração premium para gatos adultos — 1kg', price: 29.9, order: 1, category: 'Rações', imageUrl: IMG.p_dogfood },
    { name: 'Brinquedo Mordedor', description: 'Brinquedo de borracha resistente para cães', price: 24.9, order: 2, category: 'Brinquedos', imageUrl: IMG.p_dogtoy },
    { name: 'Coleira Regulável P/M', description: 'Coleira nylon ajustável tamanhos P e M', price: 19.9, order: 3, category: 'Acessórios' },
    { name: 'Shampoo Pet (500ml)', description: 'Shampoo neutro para cães e gatos — 500ml', price: 22.9, order: 4, category: 'Higiene' },
    { name: 'Areia para Gato (4kg)', description: 'Areia sanitária aglomerante para gatos — 4kg', price: 32.9, order: 5, category: 'Higiene' },
    { name: 'Petisco Dental (100g)', description: 'Petisco mastigável para higiene bucal canina', price: 14.9, order: 6, category: 'Petiscos' },
    { name: 'Cama para Pet Tamanho M', description: 'Cama almofadada tamanho médio — cores variadas', price: 69.9, order: 7, category: 'Conforto' },
  ])
  console.log('✅ Petshop Amigo Fiel (8 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 8. GELATO FRESCO
  // ══════════════════════════════════════════════════════════════════════
  const sorveteria = await upsertCompany('gelato@fresco.com.br', 'Sofia Gelato', {
    name: 'Gelato Fresco', slug: 'gelato-fresco',
    description: 'Sorvetes artesanais estilo italiano com frutas naturais e sem conservantes.',
    category: 'Sorveteria', phone: '(11) 99999-0008', whatsapp: '11999990008',
    coverUrl: IMG.c_sorvete,
    acceptsPix: true, pixKey: '11999990008',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    openingHours: {
      mon: null, // fecha segunda
      tue: { open: '13:00', close: '22:00' },
      wed: { open: '13:00', close: '22:00' },
      thu: { open: '13:00', close: '22:00' },
      fri: { open: '13:00', close: '23:00' },
      sat: { open: '12:00', close: '23:00' },
      sun: { open: '12:00', close: '21:00' },
    },
  })
  await clearProducts(sorveteria.id)
  await prisma.product.create({
    data: {
      name: 'Casquinha Dupla', description: 'Duas bolas de sorvete em casquinha crocante',
      price: 12.9, order: 0, imageUrl: IMG.p_sorvete, companyId: sorveteria.id,
      category: 'Sorvetes',
      optionGroups: {
        create: [{ name: 'Sabores (escolha 2)', type: 'MULTIPLE', required: true, minSelect: 1, maxSelect: 2,
          options: { create: [
            { name: 'Chocolate', priceAdd: 0, order: 0 }, { name: 'Morango', priceAdd: 0, order: 1 },
            { name: 'Baunilha', priceAdd: 0, order: 2 }, { name: 'Açaí', priceAdd: 2, order: 3 },
            { name: 'Pistache', priceAdd: 3, order: 4 }, { name: 'Limão Siciliano', priceAdd: 2, order: 5 },
            { name: 'Maracujá', priceAdd: 2, order: 6 },
          ] },
        }],
      },
    },
  })
  await createProducts(sorveteria.id, [
    { name: 'Sundae Chocolate', description: 'Duas bolas, calda de chocolate, chantilly e granulado', price: 18.9, order: 1, category: 'Sorvetes', imageUrl: IMG.p_sorvete },
    { name: 'Pote 500ml', description: 'Meio litro do seu sabor favorito para levar', price: 28.9, order: 2, category: 'Potes', imageUrl: IMG.p_sorvete },
    { name: 'Pote 1 Litro', description: 'Um litro de sorvete artesanal — perfeito para a família', price: 49.9, order: 3, category: 'Potes', imageUrl: IMG.p_sorvete },
    { name: 'Milkshake Artesanal (400ml)', description: 'Milk shake cremoso: chocolate, baunilha ou morango', price: 19.9, order: 4, category: 'Milkshakes', imageUrl: IMG.p_shake },
    { name: 'Açaí Gelato (400ml)', description: 'Sorvete de açaí com granola e banana', price: 16.9, order: 5, category: 'Milkshakes', imageUrl: IMG.p_acai },
  ])
  console.log('✅ Gelato Fresco (6 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 9. BOI NO ROLETE
  // ══════════════════════════════════════════════════════════════════════
  const churrasco = await upsertCompany('boi@norolete.com.br', 'Roberto Churrasco', {
    name: 'Boi no Rolete', slug: 'boi-no-rolete',
    description: 'Carnes selecionadas na brasa, tempero caseiro e muito sabor.',
    category: 'Restaurante', phone: '(11) 99999-0009', whatsapp: '11999990009',
    coverUrl: IMG.c_churrasco,
    acceptsPix: true, pixKey: '11999990009',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    hasOwnDelivery: true, ownDeliveryFee: 10,
    openingHours: {
      mon: null, tue: null, // fecha seg e ter
      wed: { open: '11:30', close: '22:00' },
      thu: { open: '11:30', close: '22:00' },
      fri: { open: '11:30', close: '23:00' },
      sat: { open: '11:30', close: '23:00' },
      sun: { open: '11:30', close: '21:00' },
    },
  })
  await createProducts(churrasco.id, [
    { name: 'Picanha na Brasa (300g)', description: 'Picanha maturada grelhada com farofa e vinagrete', price: 79.9, order: 0, category: 'Carnes', imageUrl: IMG.p_porcao },
    { name: 'Frango Assado (1/2)', description: 'Meio frango caipira assado lentamente', price: 49.9, order: 1, category: 'Carnes', imageUrl: IMG.p_chicken },
    { name: 'Costela Suína (500g)', description: 'Costela suína assada no bafo por 8 horas', price: 59.9, order: 2, category: 'Carnes', imageUrl: IMG.p_porcao },
    { name: 'Espetinho de Carne (3 un)', description: 'Três espetinhos de alcatra temperados na brasa', price: 28.9, order: 3, category: 'Espetinhos', imageUrl: IMG.p_porcao },
    { name: 'Espetinho de Frango (3 un)', description: 'Três espetinhos de frango com páprica e ervas', price: 24.9, order: 4, category: 'Espetinhos', imageUrl: IMG.p_chicken },
    { name: 'Salada Mista', description: 'Mix de folhas, tomate cereja, pepino e azeitona', price: 19.9, order: 5, category: 'Acompanhamentos', imageUrl: IMG.p_salad },
    { name: 'Farofa da Casa (200g)', description: 'Farofa crocante com bacon, ovos e temperos especiais', price: 14.9, order: 6, category: 'Acompanhamentos' },
    { name: 'Arroz com Feijão', description: 'Arroz soltinho + feijão tropeiro', price: 12.9, order: 7, category: 'Acompanhamentos' },
    { name: 'Cerveja Long Neck (355ml)', description: 'Brahma Duplo Malte, Heineken ou Corona — gelada', price: 9.9, order: 8, category: 'Bebidas' },
  ])
  console.log('✅ Boi no Rolete (9 produtos)')

  // ══════════════════════════════════════════════════════════════════════
  // 10. FARMÁCIA SAÚDE TOTAL
  // ══════════════════════════════════════════════════════════════════════
  const farmacia = await upsertCompany('farmacia@saudetotal.com.br', 'Dra. Fernanda Saúde', {
    name: 'Farmácia Saúde Total', slug: 'farmacia-saude-total',
    description: 'Medicamentos, dermocosméticos e produtos de higiene com entrega rápida.',
    category: 'Farmácia', phone: '(11) 99999-0010', whatsapp: '11999990010',
    coverUrl: IMG.c_farmacia,
    acceptsPix: true, pixKey: '11999990010',
    acceptsCashOnDelivery: true, acceptsPlatformDrivers: true,
    openingHours: HOURS_FARMACIA,
  })
  await createProducts(farmacia.id, [
    { name: 'Dipirona 500mg (20 cp)', description: 'Analgésico e antitérmico — 20 comprimidos', price: 8.9, order: 0, category: 'Medicamentos' },
    { name: 'Ibuprofeno 600mg (20 cp)', description: 'Anti-inflamatório — 20 comprimidos', price: 14.9, order: 1, category: 'Medicamentos' },
    { name: 'Vitamina C 1g (10 un)', description: 'Vitamina C efervescente 1g — 10 comprimidos', price: 18.9, order: 2, category: 'Medicamentos' },
    { name: 'Protetor Solar FPS 50 (120ml)', description: 'Protetor solar facial e corporal — 120ml', price: 34.9, order: 3, category: 'Higiene & Beleza' },
    { name: 'Shampoo Anticaspa (200ml)', description: 'Shampoo com piritionato de zinco — 200ml', price: 22.9, order: 4, category: 'Higiene & Beleza' },
    { name: 'Álcool Gel 70% (500ml)', description: 'Álcool gel bactericida — 500ml', price: 12.9, order: 5, category: 'Higiene & Beleza' },
    { name: 'Curativo (caixa 10 un)', description: 'Curativos adesivos variados — 10 unidades', price: 6.9, order: 6, category: 'Primeiros Socorros' },
    { name: 'Termômetro Digital', description: 'Termômetro digital com alarme sonoro', price: 29.9, order: 7, category: 'Equipamentos' },
  ])
  console.log('✅ Farmácia Saúde Total (8 produtos)')

  // ── Entregador ─────────────────────────────────────────────────────────
  const driverUser = await prisma.user.upsert({
    where: { email: 'entregador@exemplo.com.br' },
    update: {},
    create: {
      name: 'Lucas Entregador', email: 'entregador@exemplo.com.br',
      password: await hash('entregador123', 12),
      role: Role.DELIVERY_DRIVER, cityId: city.id,
    },
  })
  await prisma.deliveryDriver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id, cityId: city.id,
      vehicle: 'Moto Honda CG 160', vehiclePlate: 'ABC-1234',
      deliveryFee: 8, status: 'APPROVED', active: true,
    },
  })
  console.log('✅ Entregador aprovado')

  console.log('\n🎉 Seed concluído! 10 lojas, ~87 produtos com categorias e horários')
  console.log('\n📋 Credenciais:')
  console.log('  Super Admin:  admin@cidadeconectada.com.br / admin123')
  console.log('  Admin Cidade: admin@cidade-exemplo.com.br  / admin123')
  console.log('  Lojas:        [email da loja]              / loja123')
  console.log('  Entregador:   entregador@exemplo.com.br   / entregador123')
  console.log('\n🌐 http://localhost:3000/cidade-exemplo')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
