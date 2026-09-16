import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'
import ProductGrid from '@/components/product/ProductGrid'
import type { Product } from '@/types'

interface Props {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const decoded = decodeURIComponent(category)

  const rawProducts = await db.product.findMany({
    where: { isActive: true, category: { name: decoded } },
    include: { category: true, inventory: true },
    orderBy: { name: 'asc' },
  })

  const products: Product[] = rawProducts.map((p) => {
    const stock = p.inventory?.availableQuantity ?? 0
    return {
      ...p,
      category: p.category.name,
      stock,
      stockStatus: getStockStatus(stock, p.reorderLevel),
      discountPercent: getDiscountPercent(p.mrp, p.sellingPrice),
      description: p.description ?? undefined,
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{decoded}</h1>
        <p className="text-sm text-gray-500">{products.length} products</p>
      </div>
      <ProductGrid products={products} emptyMessage={`No products in ${decoded} category.`} />
    </div>
  )
}
