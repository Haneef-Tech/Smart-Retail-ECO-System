'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import type { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import StockBadge from '@/components/ui/StockBadge'
import { toast } from '@/components/ui/fresh'

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
    toast(`${product.name} added to cart`)
  }

  return (
    <div className="sr-card sr-card-hover flex flex-col overflow-hidden group">
      {/* Image on light background */}
      <Link href={`/products/${product.id}`} className="relative block bg-[#F4FAF6] pt-[100%] overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          loading="eager"
          unoptimized
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {product.discountPercent > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            -{product.discountPercent}%
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3.5 gap-0.5">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm font-medium text-[#111827] line-clamp-2 hover:text-[#15803D] leading-snug transition-colors duration-200 min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-[#6B7280]">{product.unit}</p>

        {/* Price + Add */}
        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="flex flex-col">
            <span className="font-bold text-[#111827] text-[15px] leading-tight">{formatPrice(product.sellingPrice)}</span>
            {product.discountPercent > 0 && (
              <span className="text-[11px] text-[#6B7280] line-through leading-tight">{formatPrice(product.mrp)}</span>
            )}
          </div>

          {isOut ? (
            <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed">
              Out of Stock
            </span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              className="sr-btn-primary px-4 py-1.5 text-[13px] font-semibold flex items-center gap-1"
            >
              <Plus size={14} strokeWidth={3} />
              Add
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-xl p-1 [background:linear-gradient(135deg,#16A34A,#22C55E)] shadow-[0_4px_14px_rgba(22,163,74,0.28)]">
              <button
                onClick={() => decreaseQty(product.id)}
                aria-label="Decrease quantity"
                className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all duration-200 active:scale-95"
              >
                <Minus size={13} strokeWidth={3} />
              </button>
              <span className="text-white font-bold text-[13px] min-w-5 text-center">{qty}</span>
              <button
                onClick={() => increaseQty(product.id)}
                aria-label="Increase quantity"
                className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all duration-200 active:scale-95"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        {/* Stock */}
        <div className="mt-2">
          <StockBadge status={product.stockStatus} />
        </div>
      </div>
    </div>
  )
}
