import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'
import HeroBanner from '@/components/home/HeroBanner'
import CategoryGrid from '@/components/home/CategoryGrid'
import ProductGrid from '@/components/product/ProductGrid'
import BenefitsBar from '@/components/home/BenefitsBar'
import type { Product } from '@/types'

async function getProducts(): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true, inventory: true },
    orderBy: { name: 'asc' },
  })
  return products.map((p) => {
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
}

export default async function HomePage() {
  const products = await getProducts()

  return (
    <div>
      <HeroBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <CategoryGrid />

        {/* Main Store Products Section */}
        <section id="products">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">All Supermarket Products</h2>
              <p className="text-sm text-gray-500">Fresh grocery, daily essentials, snacks, personal care &amp; stationery</p>
            </div>
            <span className="text-xs bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full">
              {products.length} Products Available
            </span>
          </div>

          <ProductGrid products={products} />
        </section>

        <BenefitsBar />
      </div>
    </div>
  )
}
