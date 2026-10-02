import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'
import ProductGrid from '@/components/product/ProductGrid'
import type { Product } from '@/types'
import { Phone, Mail, Headphones } from 'lucide-react'

interface Props {
  searchParams: Promise<{ search?: string; category?: string }>
}

async function getProducts(search?: string, category?: string): Promise<Product[]> {
  const where: Record<string, unknown> = { isActive: true }
  if (category) {
    where.category = { name: category }
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { description: { contains: search } },
    ]
  }
  const products = await db.product.findMany({
    where,
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

export default async function ProductsPage({ searchParams }: Props) {
  const { search, category } = await searchParams
  const products = await getProducts(search, category)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Store Helpdesk & Contact Bar */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border border-green-200/80 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-green-600" />
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Direct Store Ordering &amp; Customer Support</h2>
          </div>
          <p className="text-xs text-gray-600">
            Serving Mydukur, Kadapa, AP. Need assistance with your order or product inquiries? Contact us directly:
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="tel:9392951463"
            className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-green-300 text-green-800 font-bold text-xs sm:text-sm hover:bg-green-600 hover:text-white transition-colors shadow-2xs"
          >
            <Phone size={14} className="text-green-600" />
            <span>9392951463</span>
          </a>
          <a
            href="mailto:aluruhaneef1@gmail.com"
            className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-green-300 text-green-800 font-bold text-xs sm:text-sm hover:bg-green-600 hover:text-white transition-colors shadow-2xs"
          >
            <Mail size={14} className="text-green-600" />
            <span>aluruhaneef1@gmail.com</span>
          </a>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {category ? category : search ? `Results for "${search}"` : 'All Products'}
        </h1>
        <p className="text-sm text-gray-500">{products.length} products found</p>
      </div>
      <ProductGrid products={products} />
    </div>
  )
}
