import Link from 'next/link'
import type { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'

interface Props {
  title: string
  subtitle?: string
  products: Product[]
  viewAllHref?: string
}

export default function ProductSection({ title, subtitle, products, viewAllHref = '/products' }: Props) {
  if (products.length === 0) return null
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <Link href={viewAllHref} className="text-sm text-green-600 hover:text-green-700 font-medium">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {products.slice(0, 10).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
