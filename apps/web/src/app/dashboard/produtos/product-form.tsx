'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/ui/image-upload'
import { api } from '@/lib/api-client'

const optionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  priceAdd: z.number({ coerce: true }).min(0).default(0),
})

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do grupo obrigatório'),
  type: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  required: z.boolean().default(false),
  minSelect: z.number({ coerce: true }).int().min(0).default(0),
  maxSelect: z.number({ coerce: true }).int().min(1).default(1),
  options: z.array(optionSchema).default([]),
})

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number({ coerce: true }).min(0, 'Preço inválido'),
  imageUrl: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  optionGroups: z.array(groupSchema).default([]),
})

type FormData = z.infer<typeof productSchema>

interface ProductFormProps {
  defaultValues?: Partial<FormData>
  productId?: string // se existir, é edição
}

export function ProductForm({ defaultValues, productId }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { type: 'PRODUCT', optionGroups: [], ...defaultValues },
  })

  const imageUrl = watch('imageUrl')

  const { fields: groups, append: appendGroup, remove: removeGroup } = useFieldArray({
    control, name: 'optionGroups',
  })

  function toggleGroup(idx: number) {
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      if (productId) {
        await api.patch(`/api/products/${productId}`, data)
        toast.success('Produto atualizado!')
      } else {
        await api.post('/api/products', data)
        toast.success('Produto criado!')
      }
      router.push('/dashboard/produtos')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-2xl">
      {/* Dados básicos */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800">Dados do produto</h2>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input label="Nome *" placeholder="Ex: X-Burguer Especial" error={errors.name?.message} {...register('name')} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
            <select {...register('type')} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none">
              <option value="PRODUCT">Produto</option>
              <option value="SERVICE">Serviço</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
          <textarea
            {...register('description')}
            placeholder="Descreva o produto..."
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 resize-none focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="w-36">
          <Input
            label="Preço (R$) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            error={errors.price?.message}
            {...register('price')}
          />
        </div>

        <ImageUpload
          label="Imagem do produto"
          value={imageUrl ?? ''}
          onChange={(url) => setValue('imageUrl', url, { shouldDirty: true })}
          folder="products"
          aspect="square"
          hint="Recomendado: imagem quadrada (400×400px)"
        />
      </div>

      {/* Grupos de opções */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Grupos de opções</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ex: Tamanho, Adicionais, Ponto da carne</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              appendGroup({ name: '', type: 'SINGLE', required: false, minSelect: 0, maxSelect: 1, options: [] })
              setExpandedGroups((prev) => ({ ...prev, [groups.length]: true }))
            }}
          >
            <Plus size={14} />
            Grupo
          </Button>
        </div>

        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum grupo de opções. Adicione para customizar o produto.</p>
        )}

        {groups.map((group, gIdx) => {
          const isOpen = expandedGroups[gIdx] ?? true
          return (
            <OptionGroup
              key={group.id}
              gIdx={gIdx}
              isOpen={isOpen}
              onToggle={() => toggleGroup(gIdx)}
              onRemove={() => removeGroup(gIdx)}
              register={register}
              control={control}
              watch={watch}
              errors={errors}
            />
          )
        })}
      </div>

      {/* Botões */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {productId ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </div>
    </form>
  )
}

function OptionGroup({ gIdx, isOpen, onToggle, onRemove, register, control, watch, errors }: any) {
  const { fields: options, append: addOption, remove: removeOption } = useFieldArray({
    control, name: `optionGroups.${gIdx}.options`,
  })

  const groupType = watch(`optionGroups.${gIdx}.type`)
  const groupName = watch(`optionGroups.${gIdx}.name`)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header do grupo */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <GripVertical size={16} className="text-gray-300" />
        <span className="flex-1 text-sm font-medium text-gray-700 truncate">
          {groupName || `Grupo ${gIdx + 1}`}
        </span>
        <button type="button" onClick={onToggle} className="text-gray-400 hover:text-gray-600 p-1">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 p-1">
          <Trash2 size={14} />
        </button>
      </div>

      {isOpen && (
        <div className="p-4 flex flex-col gap-3">
          {/* Config do grupo */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome do grupo *" placeholder="Ex: Tamanho" {...register(`optionGroups.${gIdx}.name`)} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
              <select
                {...register(`optionGroups.${gIdx}.type`)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="SINGLE">Seleção única</option>
                <option value="MULTIPLE">Múltipla escolha</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register(`optionGroups.${gIdx}.required`)} className="rounded border-gray-300 text-primary-600" />
              <span className="text-sm text-gray-700">Obrigatório</span>
            </label>
            {groupType === 'MULTIPLE' && (
              <div className="flex items-center gap-2">
                <div className="w-20">
                  <Input label="Mín." type="number" min="0" {...register(`optionGroups.${gIdx}.minSelect`)} />
                </div>
                <div className="w-20">
                  <Input label="Máx." type="number" min="1" {...register(`optionGroups.${gIdx}.maxSelect`)} />
                </div>
              </div>
            )}
          </div>

          {/* Opções do grupo */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Opções</p>
            {options.map((opt, oIdx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input
                  placeholder="Nome da opção"
                  className="flex-1"
                  {...register(`optionGroups.${gIdx}.options.${oIdx}.name`)}
                />
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="+0,00"
                    {...register(`optionGroups.${gIdx}.options.${oIdx}.priceAdd`)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(oIdx)}
                  className="text-red-400 hover:text-red-600 p-1 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start gap-1.5 text-primary-600"
              onClick={() => addOption({ name: '', priceAdd: 0 })}
            >
              <Plus size={13} />
              Adicionar opção
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
