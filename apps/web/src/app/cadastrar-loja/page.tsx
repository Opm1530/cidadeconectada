export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@cc/database'
import { CadastrarLojaForm } from './form'

export default async function CadastrarLojaPage() {
  const session = await getSession()

  // Não logado → login com redirect de volta
  if (!session) redirect('/login?redirect=/cadastrar-loja')

  // Já tem loja → vai direto pro dashboard
  if (session.role === 'COMPANY_OWNER') redirect('/dashboard')

  const cities = await prisma.city.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, state: true },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastre sua loja</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Comece a vender para toda a sua cidade em minutos
          </p>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { emoji: '📦', text: 'Gerencie pedidos pelo celular' },
            { emoji: '🚴', text: 'Entregadores disponíveis' },
            { emoji: '💳', text: 'Pix, dinheiro e mais' },
          ].map((b) => (
            <div key={b.text} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <div className="text-2xl mb-1">{b.emoji}</div>
              <p className="text-xs text-gray-500 leading-snug">{b.text}</p>
            </div>
          ))}
        </div>

        {/* Formulário */}
        <CadastrarLojaForm cities={cities} userName={session.name} />

        <p className="text-center text-xs text-gray-400 mt-6">
          Ao cadastrar, você concorda com os termos de uso da plataforma.
        </p>
      </div>
    </div>
  )
}
