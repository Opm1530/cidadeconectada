'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/ui/image-upload'
import { api } from '@/lib/api-client'
import { CreditCard, QrCode, Wallet, Bike, Store, MessageCircle, Image as ImageIcon } from 'lucide-react'

const schema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  phone:       z.string().optional(),
  whatsapp:    z.string().optional(),
  address:     z.string().optional(),
  category:    z.string().optional(),
  logoUrl:     z.string().optional(),
  coverUrl:    z.string().optional(),
  // Pagamento
  acceptsMercadoPago:   z.boolean(),
  mercadoPagoToken:     z.string().optional(),
  acceptsPix:           z.boolean(),
  pixKey:               z.string().optional(),
  acceptsCashOnDelivery: z.boolean(),
  // Entrega
  hasOwnDelivery:        z.boolean(),
  ownDeliveryFee:        z.number({ coerce: true }).min(0).optional(),
  acceptsPlatformDrivers: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface SettingsFormProps {
  companySlug: string
  defaultValues: FormData
}

export function SettingsForm({ companySlug, defaultValues }: SettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const acceptsMercadoPago    = watch('acceptsMercadoPago')
  const acceptsPix            = watch('acceptsPix')
  const hasOwnDelivery        = watch('hasOwnDelivery')
  const logoUrl               = watch('logoUrl')
  const coverUrl              = watch('coverUrl')
  const whatsapp              = watch('whatsapp') ?? ''

  // Número limpo para o QR code
  const whatsappClean = whatsapp.replace(/\D/g, '')
  const waLink = whatsappClean ? `https://wa.me/55${whatsappClean}` : ''
  const qrUrl  = waLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(waLink)}`
    : null

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await api.patch(`/api/companies/${companySlug}`, data)
      toast.success('Configurações salvas!')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* ── Imagens ─────────────────────────────────────────────────────── */}
      <Section title="Logo e banner" icon={<ImageIcon size={16} />}>
        <ImageUpload
          label="Logo da loja"
          value={logoUrl ?? ''}
          onChange={(url) => setValue('logoUrl', url, { shouldDirty: true })}
          folder="logos"
          aspect="square"
          hint="Recomendado: imagem quadrada (400×400px)"
        />
        <ImageUpload
          label="Banner / Capa"
          value={coverUrl ?? ''}
          onChange={(url) => setValue('coverUrl', url, { shouldDirty: true })}
          folder="covers"
          aspect="banner"
          hint="Recomendado: imagem horizontal (1200×400px)"
        />
      </Section>

      {/* ── Informações básicas ──────────────────────────────────────────── */}
      <Section title="Informações da loja" icon={<Store size={16} />}>
        <Input label="Nome da loja *" error={errors.name?.message} {...register('name')} />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 resize-none focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
          <select {...register('category')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none">
            <option value="">Selecione</option>
            {['Restaurante', 'Lanchonete', 'Pizzaria', 'Mercado', 'Farmácia', 'Padaria', 'Açaí', 'Sushi', 'Bebidas', 'Doceria', 'Petshop', 'Serviços', 'Moda', 'Eletrônicos', 'Hortifruti', 'Papelaria', 'Brinquedos'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Telefone" type="tel" {...register('phone')} />
          <Input label="WhatsApp" type="tel" placeholder="11999999999" {...register('whatsapp')} />
        </div>
        <Input label="Endereço" {...register('address')} />
      </Section>

      {/* ── WhatsApp ─────────────────────────────────────────────────────── */}
      <Section title="WhatsApp da loja" icon={<MessageCircle size={16} />}>
        <p className="text-sm text-gray-500">
          Os clientes vão escanear o QR code abaixo para falar direto com sua loja no WhatsApp.
        </p>

        <Input
          label="Número do WhatsApp"
          type="tel"
          placeholder="11999999999 (só números, com DDD)"
          {...register('whatsapp')}
        />

        {qrUrl ? (
          <div className="flex items-center gap-5 p-4 bg-green-50 border border-green-100 rounded-xl">
            <img src={qrUrl} alt="QR Code WhatsApp" width={120} height={120} className="rounded-lg border border-white shadow-sm" />
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">QR Code gerado!</p>
              <p className="text-xs text-gray-500 mb-3">
                O cliente escaneia e cai direto no seu WhatsApp.<br />
                Link: <span className="text-green-700 break-all">{waLink}</span>
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 font-medium underline"
              >
                Testar link →
              </a>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
            Digite o número acima para gerar o QR code
          </div>
        )}
      </Section>

      {/* ── Pagamento ────────────────────────────────────────────────────── */}
      <Section title="Pagamentos" icon={<CreditCard size={16} />}>
        {/* Mercado Pago */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" {...register('acceptsMercadoPago')} className="rounded border-gray-300 text-primary-600 h-4 w-4" />
            <div className="flex items-center gap-2 flex-1">
              <CreditCard size={16} className="text-blue-500" />
              <span className="font-medium text-sm text-gray-800">Aceitar Mercado Pago</span>
            </div>
          </label>
          {acceptsMercadoPago && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <Input label="Token de acesso (Access Token)" type="password" placeholder="APP_USR-..." {...register('mercadoPagoToken')} />
              <p className="text-xs text-gray-400 mt-1">Mercado Pago → Suas Integrações → Credenciais → Access Token</p>
            </div>
          )}
        </div>

        {/* Pix */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" {...register('acceptsPix')} className="rounded border-gray-300 text-primary-600 h-4 w-4" />
            <div className="flex items-center gap-2 flex-1">
              <QrCode size={16} className="text-purple-500" />
              <span className="font-medium text-sm text-gray-800">Aceitar Pix</span>
            </div>
          </label>
          {acceptsPix && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <Input label="Chave Pix" placeholder="CPF, CNPJ, e-mail ou telefone" {...register('pixKey')} />
            </div>
          )}
        </div>

        {/* Dinheiro */}
        <label className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
          <input type="checkbox" {...register('acceptsCashOnDelivery')} className="rounded border-gray-300 text-primary-600 h-4 w-4" />
          <Wallet size={16} className="text-green-500" />
          <span className="font-medium text-sm text-gray-800">Aceitar pagamento na entrega (dinheiro)</span>
        </label>
      </Section>

      {/* ── Entrega ──────────────────────────────────────────────────────── */}
      <Section title="Entrega" icon={<Bike size={16} />}>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" {...register('hasOwnDelivery')} className="rounded border-gray-300 text-primary-600 h-4 w-4" />
            <div className="flex-1">
              <span className="font-medium text-sm text-gray-800">Entrega própria</span>
              <p className="text-xs text-gray-400">Você mesmo faz as entregas</p>
            </div>
          </label>
          {hasOwnDelivery && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 w-44">
              <Input label="Taxa de entrega (R$)" type="number" step="0.50" min="0" {...register('ownDeliveryFee')} />
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
          <input type="checkbox" {...register('acceptsPlatformDrivers')} className="rounded border-gray-300 text-primary-600 h-4 w-4" />
          <div>
            <span className="font-medium text-sm text-gray-800">Entregadores da plataforma</span>
            <p className="text-xs text-gray-400">Clientes escolhem um entregador cadastrado</p>
          </div>
        </label>
      </Section>

      <div className="flex gap-3">
        <Button type="submit" loading={loading} disabled={!isDirty}>
          Salvar configurações
        </Button>
      </div>
    </form>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2">
        <span className="text-primary-600">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}
