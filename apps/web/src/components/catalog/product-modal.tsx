'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@cc/shared'
import type { Product, CartItemOption, ProductOptionGroup } from '@cc/shared'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
  companyId: string
  companyName: string
  cityId: string
  citySlug: string
}

export function ProductModal({ product, onClose, companyId, companyName, cityId }: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem)
  const cart = useCartStore((s) => s.cart)

  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({}) // groupId → optionIds

  // Reseta ao abrir novo produto
  const open = !!product

  function toggleOption(group: ProductOptionGroup, optionId: string) {
    setSelectedOptions((prev) => {
      const current = prev[group.id] ?? []
      if (group.type === 'SINGLE') {
        return { ...prev, [group.id]: [optionId] }
      }
      // MULTIPLE
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) }
      }
      if (current.length >= group.maxSelect) {
        toast.error(`Máximo de ${group.maxSelect} opções para "${group.name}"`)
        return prev
      }
      return { ...prev, [group.id]: [...current, optionId] }
    })
  }

  const flatOptions: CartItemOption[] = useMemo(() => {
    if (!product) return []
    const result: CartItemOption[] = []
    for (const group of product.optionGroups) {
      const selected = selectedOptions[group.id] ?? []
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId)
        if (opt) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            priceAdd: opt.priceAdd,
          })
        }
      }
    }
    return result
  }, [product, selectedOptions])

  const unitPrice = useMemo(() => {
    if (!product) return 0
    return product.price + flatOptions.reduce((acc, o) => acc + o.priceAdd, 0)
  }, [product, flatOptions])

  function validate(): boolean {
    if (!product) return false
    for (const group of product.optionGroups) {
      const count = (selectedOptions[group.id] ?? []).length
      if (group.required && count < group.minSelect) {
        toast.error(`Selecione ao menos ${group.minSelect} opção em "${group.name}"`)
        return false
      }
    }
    return true
  }

  function handleAdd() {
    if (!product || !validate()) return

    const isDifferentCompany = cart && cart.companyId !== companyId
    if (isDifferentCompany) {
      toast('Seu carrinho foi esvaziado', { description: 'Só é possível comprar de uma loja por pedido.' })
    }

    addItem(product, quantity, flatOptions, notes || undefined, companyId, companyName, cityId)
    toast.success(`${product.name} adicionado ao carrinho!`)
    onClose()
    setQuantity(1)
    setNotes('')
    setSelectedOptions({})
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      {product && (
        <div>
          {/* Imagem */}
          {product.imageUrl && (
            <div className="relative h-52 w-full bg-gray-100">
              <Image src={product.imageUrl} alt={product.name} fill sizes="100vw" unoptimized className="object-cover" />
            </div>
          )}

          <div className="p-5 flex flex-col gap-5">
            {/* Info produto */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-gray-500 mt-1">{product.description}</p>
              )}
              <p className="text-xl font-bold text-primary-600 mt-2">{formatCurrency(product.price)}</p>
            </div>

            {/* Grupos de opções */}
            {product.optionGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{group.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {group.type === 'SINGLE' ? 'Escolha 1 opção' :
                        `Escolha ${group.minSelect > 0 ? `de ${group.minSelect} a ` : 'até '}${group.maxSelect}`}
                    </p>
                  </div>
                  {group.required && (
                    <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                      Obrigatório
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {group.options.filter((o) => o.active).map((option) => {
                    const isSelected = (selectedOptions[group.id] ?? []).includes(option.id)
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(group, option.id)}
                        className={cn(
                          'flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-colors text-left',
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-4 h-4 border-2 flex items-center justify-center transition-colors',
                            group.type === 'SINGLE' ? 'rounded-full' : 'rounded',
                            isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300',
                          )}>
                            {isSelected && <div className={cn('bg-white', group.type === 'SINGLE' ? 'w-1.5 h-1.5 rounded-full' : 'w-2 h-2 rounded-sm')} />}
                          </div>
                          <span className="text-sm text-gray-800">{option.name}</span>
                        </div>
                        {option.priceAdd > 0 && (
                          <span className="text-sm font-medium text-gray-600">
                            +{formatCurrency(option.priceAdd)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Observações */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Alguma observação?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sem cebola, ponto da carne..."
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Quantidade + botão */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow text-gray-600"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-semibold w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow text-gray-600"
                >
                  <Plus size={14} />
                </button>
              </div>

              <Button onClick={handleAdd} size="lg" className="flex-1 gap-2">
                <ShoppingCart size={18} />
                Adicionar · {formatCurrency(unitPrice * quantity)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
