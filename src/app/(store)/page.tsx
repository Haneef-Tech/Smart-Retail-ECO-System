import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'
import HeroBanner from '@/components/home/HeroBanner'
import CategorySidebar from '@/components/home/CategorySidebar'
import ProductGrid from '@/components/product/ProductGrid'
import BenefitsBar from '@/components/home/BenefitsBar'
import { SectionHeader } from '@/components/ui/fresh'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

async function getProducts(): Promise<Product[]> {
  try {
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
  } catch (err) {
    console.error('[HomePage getProducts error]', err)
    return []
  }
}

export default async function HomePage() {
  const products = await getProducts()

  return (
    <div className="sr-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6 sm:space-y-8">
        <HeroBanner />

        <div className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] gap-5 sm:gap-6 items-start">
          {/* Left sidebar */}
          <div className="lg:sticky lg:top-20">
            <CategorySidebar />
          </div>

          {/* Popular Products */}
          <section id="products" className="min-w-0">
            <SectionHeader
              title="Popular Products"
              subtitle={`${products.length} fresh picks available today`}
              linkLabel="View All"
              linkHref="/products"
            />
            <ProductGrid products={products} />
          </section>
        </div>

        <BenefitsBar />
      </div>
    </div>
  )
}
