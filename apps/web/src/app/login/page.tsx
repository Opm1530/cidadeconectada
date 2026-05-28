'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const user = await login(data.email, data.password)
      toast.success('Bem-vindo!')

      // ?redirect sempre tem prioridade (ex: veio de uma página protegida)
      const redirect = params.get('redirect')
      if (redirect) { router.push(redirect); return }

      // Redireciona direto pelo papel do usuário
      if (user.role === 'SUPER_ADMIN' || user.role === 'CITY_ADMIN') {
        router.push('/admin')
        return
      }
      if (user.role === 'COMPANY_OWNER') {
        router.push('/dashboard')
        return
      }
      if (user.role === 'DELIVERY_DRIVER') {
        router.push('/entregador')
        return
      }

      // CUSTOMER — vai para a cidade salva no browser ou para a cidade do parâmetro
      const savedCity =
        typeof window !== 'undefined' ? localStorage.getItem('cc_city') : null
      const cityParam = params.get('city')
      const dest = savedCity ? `/${savedCity}` : cityParam ? `/${cityParam}` : '/'
      router.push(dest)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const city = params.get('city')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary-600 font-bold text-xl">
            <Store size={24} />
            Cidade Conectada
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Entre na sua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Não tem conta?{' '}
            <Link
              href={`/registro${city ? `?city=${city}` : ''}`}
              className="text-primary-600 font-medium hover:underline"
            >
              Cadastre-se
            </Link>
          </p>
        </div>

        {city && (
          <p className="text-center mt-4">
            <Link href={`/${city}`} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar para a loja
            </Link>
          </p>
        )}

        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-1">Quer vender no Cidade Conectada?</p>
          <p className="text-xs text-gray-400 mb-3">Cadastre sua loja e comece a receber pedidos hoje</p>
          <Link
            href="/cadastrar-loja"
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Store size={15} />
            Cadastrar minha loja
          </Link>
        </div>
      </div>
    </div>
  )
}
