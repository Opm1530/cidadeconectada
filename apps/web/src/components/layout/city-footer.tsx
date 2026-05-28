import Link from 'next/link'
import {
  MapPin, Phone, Mail, Instagram, Facebook, MessageCircle,
  Store, Newspaper, BarChart3, ShoppingBag, Bike, ChevronRight,
} from 'lucide-react'

interface CityFooterProps {
  city: {
    name: string
    slug: string
    footerAbout?: string | null
    footerPhone?: string | null
    footerEmail?: string | null
    footerAddress?: string | null
    footerInstagram?: string | null
    footerFacebook?: string | null
    footerWhatsapp?: string | null
  }
}

export function CityFooter({ city }: CityFooterProps) {
  const hasSocial = city.footerInstagram || city.footerFacebook || city.footerWhatsapp
  const hasContact = city.footerPhone || city.footerEmail || city.footerAddress

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      {/* Bloco principal */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Coluna 1: Identidade da cidade */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
                <Store size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">{city.name}</span>
            </div>

            {city.footerAbout ? (
              <p className="text-sm leading-relaxed">{city.footerAbout}</p>
            ) : (
              <p className="text-sm leading-relaxed text-gray-500">
                Plataforma digital de comunicação e comércio de {city.name}.
              </p>
            )}

            {/* Redes sociais */}
            {hasSocial && (
              <div className="flex gap-2 pt-1">
                {city.footerInstagram && (
                  <a
                    href={city.footerInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={16} />
                  </a>
                )}
                {city.footerFacebook && (
                  <a
                    href={city.footerFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook size={16} />
                  </a>
                )}
                {city.footerWhatsapp && (
                  <a
                    href={`https://wa.me/${city.footerWhatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-green-600 transition-colors"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Coluna 2: Catálogo */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Catálogo</h3>
            <ul className="space-y-2.5">
              {[
                { href: `/${city.slug}`, icon: Store, label: 'Lojas e serviços' },
                { href: `/${city.slug}/pedidos`, icon: ShoppingBag, label: 'Meus pedidos' },
                { href: `/entregador/cadastro`, icon: Bike, label: 'Seja um entregador' },
                { href: `/cadastrar-loja`, icon: Store, label: 'Ser lojista' },
              ].map(({ href, icon: Icon, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                  >
                    <Icon size={14} className="text-gray-600 group-hover:text-primary-400 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 3: Cidade */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Cidade</h3>
            <ul className="space-y-2.5">
              {[
                { href: `/${city.slug}/noticias`, icon: Newspaper, label: 'Notícias' },
                { href: `/${city.slug}/enquetes`, icon: BarChart3, label: 'Enquetes' },
              ].map(({ href, icon: Icon, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                  >
                    <Icon size={14} className="text-gray-600 group-hover:text-primary-400 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 4: Contato */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Contato</h3>
            {hasContact ? (
              <ul className="space-y-3">
                {city.footerAddress && (
                  <li className="flex items-start gap-2.5 text-sm">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-gray-600" />
                    <span>{city.footerAddress}</span>
                  </li>
                )}
                {city.footerPhone && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <Phone size={14} className="shrink-0 text-gray-600" />
                    <a href={`tel:${city.footerPhone}`} className="hover:text-white transition-colors">
                      {city.footerPhone}
                    </a>
                  </li>
                )}
                {city.footerEmail && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <Mail size={14} className="shrink-0 text-gray-600" />
                    <a href={`mailto:${city.footerEmail}`} className="hover:text-white transition-colors break-all">
                      {city.footerEmail}
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-600 italic">
                Configure as informações de contato no painel admin.
              </p>
            )}

            {/* CTA para admin */}
            <Link
              href="/admin/configuracoes"
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary-400 transition-colors mt-2"
            >
              <ChevronRight size={12} />
              Configurar rodapé
            </Link>
          </div>

        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} {city.name}. Todos os direitos reservados.
          </p>
          <p className="text-xs text-gray-700">
            Powered by{' '}
            <span className="text-primary-500 font-medium">Cidade Conectada</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
