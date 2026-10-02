import { notFound } from 'next/navigation'
import Image from 'next/image'
import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent, formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import AddToCartButton from '@/components/product/AddToCartButton'
import StockBadge from '@/components/ui/StockBadge'
import { Phone, Mail } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

async function getProduct(id: string): Promise<Product | null> {
  const p = await db.product.findUnique({
    where: { id },
    include: { category: true, inventory: true },
  })
  if (!p) return null
  const stock = p.inventory?.availableQuantity ?? 0
  return {
    ...p,
    category: p.category.name,
    stock,
    stockStatus: getStockStatus(stock, p.reorderLevel),
    discountPercent: getDiscountPercent(p.mrp, p.sellingPrice),
    description: p.description ?? undefined,
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {/* Image */}
        <div className="relative bg-gray-50 rounded-2xl overflow-hidden pt-[100%]">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized
            className="object-contain p-8"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          {product.discountPercent > 0 && (
            <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              -{product.discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">{product.category}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {product.sku}</p>
            <p className="text-sm text-gray-500 mt-0.5">{product.unit}</p>
          </div>

          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.sellingPrice)}</span>
            {product.discountPercent > 0 && (
              <span className="text-lg text-gray-400 line-through">{formatPrice(product.mrp)}</span>
            )}
          </div>
          {product.discountPercent > 0 && (
            <p className="text-green-600 font-semibold text-sm">
              You save {formatPrice(product.mrp - product.sellingPrice)} ({product.discountPercent}%)
            </p>
          )}

          <StockBadge status={product.stockStatus} />

          {/* Availability info */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Category</span>
              <span className="font-medium">{product.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unit</span>
              <span className="font-medium">{product.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Availability</span>
              <span className="font-medium">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
            </div>
          </div>

          <AddToCartButton product={product} />

          {/* Store Support Card */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>Direct Store Orders &amp; Queries:</span>
            <div className="flex items-center gap-3">
              <a href="tel:9392951463" className="inline-flex items-center gap-1 text-green-700 font-semibold hover:underline">
                <Phone size={13} /> 9392951463
              </a>
              <span>•</span>
              <a href="mailto:aluruhaneef1@gmail.com" className="inline-flex items-center gap-1 text-green-700 font-semibold hover:underline">
                <Mail size={13} /> aluruhaneef1@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
