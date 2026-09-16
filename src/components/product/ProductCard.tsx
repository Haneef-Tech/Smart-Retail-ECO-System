'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import type { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import StockBadge from '@/components/ui/StockBadge'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const increaseQty = useCartStore((s) => s.increaseQty)
  const decreaseQty = useCartStore((s) => s.decreaseQty)

  const cartItem = items.find((i) => i.productId === product.id)
  const qty = cartItem?.quantity ?? 0
  const isOut = product.stockStatus === 'out'

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      category: product.category,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Image */}
      <Link href={`/products/${product.id}`} className="relative block bg-gray-50 pt-[100%] overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          loading="eager"
          unoptimized
          className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {product.discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{product.discountPercent}%
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{product.category}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 hover:text-green-700 leading-snug">{product.name}</h3>
        </Link>
        <p className="text-[11px] text-gray-400">{product.unit}</p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-bold text-gray-900 text-base">{formatPrice(product.sellingPrice)}</span>
          {product.discountPercent > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.mrp)}</span>
          )}
        </div>

        {/* Stock */}
        <StockBadge status={product.stockStatus} />

        {/* Cart Action */}
        <div className="mt-auto pt-2">
          {isOut ? (
            <button disabled className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
              Out of Stock
            </button>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <ShoppingCart size={15} />
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-between bg-green-600 rounded-xl px-2 py-1.5">
              <button
                onClick={() => decreaseQty(product.id)}
                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-white font-bold text-sm">{qty}</span>
              <button
                onClick={() => increaseQty(product.id)}
                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
