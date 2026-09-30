import type { Product } from '@/types'
import ProductCard from './ProductCard'

interface Props {
  products: Product[]
  emptyMessage?: string
}

export default function ProductGrid({ products, emptyMessage = 'No products found.' }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🛒</p>
        <p className="text-base">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {products.map((product, i) => (
        <div key={product.id} className="sr-stagger" style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
