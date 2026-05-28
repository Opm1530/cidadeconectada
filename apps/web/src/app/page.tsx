import Link from 'next/link'
import {
  MapPin, Store, Bike, CreditCard, ArrowRight, ChevronDown, User,
  ShoppingBag, Megaphone, BarChart3, Newspaper, Building2, Users,
  CheckCircle, Star, Zap, Shield, Globe, HeartHandshake,
} from 'lucide-react'
import { prisma } from '@cc/database'
import { getSession } from '@/lib/auth/session'
import { HomeRedirect } from '@/components/home-redirect'

export default async function HomePage() {
  const [cities, session] = await Promise.all([
    prisma.city.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, state: true, slug: true,
        _count: { select: { companies: true } },
      },
    }),
    getSession(),
  ])

  const loggedInHref =
    session?.role === 'SUPER_ADMIN'   ? '/admin' :
    session?.role === 'CITY_ADMIN'    ? '/admin' :
    session?.role === 'COMPANY_OWNER' ? '/dashboard' :
    session?.role === 'DELIVERY_DRIVER' ? '/entregador' :
    cities.length === 1 ? `/${cities[0].slug}` : '#cidades'

  const totalCompanies = cities.reduce((s, c) => s + c._count.companies, 0)

  // Slug da única cidade disponível (para redirecionar clientes automaticamente)
  const singleCitySlug = cities.length === 1 ? cities[0].slug : undefined

  return (
    <div className="min-h-screen bg-white">
      {/* Redireciona usuários logados direto para seu painel */}
      {session && (
        <HomeRedirect role={session.role} citySlug={singleCitySlug} />
      )}

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary-600 font-black text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            Cidade Conectada
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href={loggedInHref}
                className="flex items-center gap-2 text-sm font-semibold bg-primary-600 text-white px-4 py-2 rounded-full hover:bg-primary-700 transition-colors shadow-sm"
              >
                <User size={14} />
                {session.name?.split(' ')[0] ?? 'Minha conta'}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors px-3 py-2"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  className="text-sm font-semibold bg-primary-600 text-white px-5 py-2 rounded-full hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Cadastrar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-purple-700 py-28 px-4">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-10 right-1/4 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute bottom-10 left-1/3 w-20 h-20 bg-white/10 rounded-full" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary-200 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full mb-8">
            Marketplace 100% local
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-white mb-6">
            O comércio da sua cidade,<br />
            <span className="text-primary-200">no seu bolso.</span>
          </h1>
          <p className="text-lg text-primary-100 max-w-2xl mx-auto leading-relaxed mb-10">
            Pedidos, entregas, notícias da prefeitura e enquetes — tudo em uma única plataforma feita para conectar cidadãos e comércio local.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#cidades"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-full hover:bg-primary-50 transition-colors shadow-xl"
            >
              <MapPin size={18} />
              Ver cidades disponíveis
            </a>
            <a
              href="#para-negocios"
              className="inline-flex items-center gap-2 text-white font-medium px-6 py-3.5 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
            >
              Para negócios
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Números rápidos */}
          {(cities.length > 0 || totalCompanies > 0) && (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-black text-white">{cities.length}</p>
                <p className="text-sm text-primary-200 mt-0.5">{cities.length === 1 ? 'cidade' : 'cidades'}</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-black text-white">{totalCompanies}</p>
                <p className="text-sm text-primary-200 mt-0.5">{totalCompanies === 1 ? 'loja' : 'lojas'}</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-black text-white">100%</p>
                <p className="text-sm text-primary-200 mt-0.5">local</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Uma plataforma para todos</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Moradores, comerciantes, entregadores e prefeitura — cada um com seu espaço.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Users,
                color: 'bg-primary-600',
                bg: 'from-primary-50 to-purple-50 border-primary-100',
                title: 'Moradores',
                desc: 'Peça em lojas locais, acompanhe entregas e participe de enquetes da sua cidade.',
              },
              {
                icon: Store,
                color: 'bg-orange-500',
                bg: 'from-orange-50 to-amber-50 border-orange-100',
                title: 'Comerciantes',
                desc: 'Receba pedidos, gerencie cardápio e aumente suas vendas sem mensalidade absurda.',
              },
              {
                icon: Bike,
                color: 'bg-green-600',
                bg: 'from-green-50 to-emerald-50 border-green-100',
                title: 'Entregadores',
                desc: 'Faça entregas locais com rotas curtas, ganhos justos e sem vínculo de exclusividade.',
              },
              {
                icon: Building2,
                color: 'bg-blue-600',
                bg: 'from-blue-50 to-cyan-50 border-blue-100',
                title: 'Prefeitura',
                desc: 'Publique notícias, campanhas de saúde, eventos e crie enquetes com a população.',
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className={`flex flex-col gap-4 p-6 rounded-2xl bg-gradient-to-br border ${bg}`}>
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Tudo que a sua cidade precisa</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Do pedido de comida à comunicação da prefeitura com o cidadão.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: ShoppingBag,    title: 'Pedidos online',       desc: 'Cardápio digital, carrinho e acompanhamento em tempo real do pedido.' },
              { icon: Bike,           title: 'Entrega local',        desc: 'Rede de entregadores cadastrados na cidade com taxas transparentes.' },
              { icon: CreditCard,     title: 'Múltiplas formas de pagamento', desc: 'Pix, Mercado Pago ou dinheiro na entrega — você escolhe.' },
              { icon: Newspaper,      title: 'Notícias da prefeitura', desc: 'Vacinas, eventos, segurança e obras — tudo publicado pela prefeitura.' },
              { icon: BarChart3,      title: 'Enquetes cidadãs',     desc: 'Vote em questões importantes da sua cidade e veja os resultados.' },
              { icon: Megaphone,      title: 'Campanhas e banners',  desc: 'A prefeitura divulga campanhas diretamente na tela inicial da plataforma.' },
              { icon: Shield,         title: 'Seguro e confiável',   desc: 'JWT, cookies HTTP-only e dados protegidos por padrão.' },
              { icon: Zap,            title: 'Rápido e leve',        desc: 'Construído com Next.js 15 + React 19 para máxima performance.' },
              { icon: Globe,          title: 'Multi-cidade',         desc: 'Cada cidade tem seu próprio catálogo, regras e identidade visual.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={18} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CIDADES ── */}
      <section id="cidades" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Cidades disponíveis</h2>
              <p className="text-gray-500 text-sm">Selecione sua cidade e comece a explorar.</p>
            </div>
            <span className="text-sm text-gray-400">{cities.length} {cities.length === 1 ? 'cidade ativa' : 'cidades ativas'}</span>
          </div>

          {cities.length === 0 ? (
            <div className="text-center py-24 bg-gray-50 rounded-2xl border border-gray-100">
              <MapPin size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Nenhuma cidade disponível ainda.</p>
              <p className="text-gray-300 text-sm mt-1">Em breve novas cidades serão adicionadas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city) => (
                <div
                  key={city.id}
                  className="group relative bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 rounded-2xl p-6 flex flex-col gap-5 shadow-lg shadow-primary-100 hover:shadow-xl hover:shadow-primary-200 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  {/* Decoração */}
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
                  <div className="absolute bottom-4 right-4 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />

                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-primary-300" />
                      <p className="text-primary-300 text-xs font-medium">{city.state}</p>
                    </div>
                    <p className="text-white font-black text-2xl leading-tight">{city.name}</p>
                  </div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                      <Store size={12} className="text-primary-200" />
                      <span className="text-primary-100 text-xs font-medium">
                        {city._count.companies} {city._count.companies === 1 ? 'loja' : 'lojas'}
                      </span>
                    </div>
                    <Link
                      href={`/${city.slug}`}
                      className="inline-flex items-center gap-1.5 bg-white text-primary-700 font-bold text-sm px-5 py-2 rounded-full hover:bg-primary-50 transition-colors shadow-sm"
                    >
                      Acessar
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── PARA NEGÓCIOS ── */}
      <section id="para-negocios" className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary-400 bg-primary-400/10 px-3 py-1 rounded-full mb-6">
                Para negócios
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-6">
                Coloque sua empresa no mapa da cidade.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Crie seu cardápio digital, receba pedidos pelo WhatsApp ou pelo app, e ganhe visibilidade para toda a cidade — sem pagar comissão absurda por pedido.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  'Cardápio digital com foto, preço e categorias',
                  'Notificação de pedido no WhatsApp',
                  'Painel completo de gestão de pedidos',
                  'Relatório de vendas e faturamento',
                  'Suporte a entregadores próprios ou da plataforma',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-7 py-3.5 rounded-full hover:bg-primary-500 transition-colors shadow-lg shadow-primary-900"
              >
                Cadastrar meu negócio
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Star,            label: 'Sem comissão por pedido',  sub: 'Você paga uma assinatura fixa, não por venda.' },
                { icon: Zap,             label: 'Ative em minutos',          sub: 'Cadastro simples, sem burocracia.' },
                { icon: HeartHandshake,  label: 'Suporte local',             sub: 'Time da plataforma na sua cidade.' },
                { icon: Globe,           label: 'Visibilidade online',        sub: 'Apareça para todos os moradores da cidade.' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/30 flex items-center justify-center">
                    <Icon size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-4 bg-primary-50 border-t border-primary-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
            Sua cidade ainda não está aqui?
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Entre em contato e vamos colocar sua cidade no mapa. A plataforma é implantada rapidamente e você tem controle total.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-8 py-3.5 rounded-full hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
            >
              Quero para minha cidade
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-gray-600 font-medium px-6 py-3.5 hover:text-primary-600 transition-colors"
            >
              Já tenho acesso — Entrar
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-primary-600 font-bold">
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
              <Store size={12} className="text-white" />
            </div>
            Cidade Conectada
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Cidade Conectada. Feito com carinho para o comércio local.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/login" className="hover:text-primary-600 transition-colors">Entrar</Link>
            <Link href="/registro" className="hover:text-primary-600 transition-colors">Cadastrar</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
