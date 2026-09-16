'use client'

import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import type { Product } from '@/types'

export default function AddToCartButton({ product }: { product: Product }) {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const increaseQty = useCartStore((s) => s.increaseQty)
  const decreaseQty = useCartStore((s) => s.decreaseQty)

  const cartItem = items.find((i) => i.productId === product.id)
  const qty = cartItem?.quantity ?? 0
  const isOut = product.stockStatus === 'out'

  if (isOut) {
    return (
      <button disabled className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 font-semibold cursor-not-allowed">
        Out of Stock
      </button>
    )
  }

  if (qty === 0) {
    return (
      <button
        onClick={() => addItem({ productId: product.id, name: product.name, imageUrl: product.imageUrl, mrp: product.mrp, sellingPrice: product.sellingPrice, unit: product.unit, category: product.category })}
        className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <ShoppingCart size={18} /> Add to Cart
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between bg-green-600 rounded-xl px-4 py-3">
      <button onClick={() => decreaseQty(product.id)} className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center">
        <Minus size={16} />
      </button>
      <span className="text-white font-bold text-lg">{qty} in cart</span>
      <button onClick={() => increaseQty(product.id)} className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center">
        <Plus size={16} />
      </button>
    </div>
  )
}
