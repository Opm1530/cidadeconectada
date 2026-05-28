import { ProductForm } from '../product-form'

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Novo Produto</h1>
        <p className="text-sm text-gray-400 mt-0.5">Preencha as informações do produto</p>
      </div>
      <ProductForm />
    </div>
  )
}
