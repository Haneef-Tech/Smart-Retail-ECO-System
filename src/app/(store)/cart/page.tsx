'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const increaseQty = useCartStore((s) => s.increaseQty)
  const decreaseQty = useCartStore((s) => s.decreaseQty)
  const deleteItem = useCartStore((s) => s.deleteItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const [gstRates, setGstRates] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/gst')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, number> = {}
        for (const r of data.rates || []) map[r.category] = r.rate
        setGstRates(map)
      })
  }, [])

  const subtotal = items.reduce((s, i) => s + i.sellingPrice * i.quantity, 0)
  const discount = items.reduce((s, i) => s + (i.mrp - i.sellingPrice) * i.quantity, 0)
  const tax = items.reduce((s, i) => s + i.sellingPrice * i.quantity * (gstRates[i.category] || 0), 0)
  const total = subtotal + tax

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some products and they'll appear here.</p>
        <Link href="/products" className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Shopping Cart ({items.length})</h1>
        <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear all</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm">
              <div className="relative w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-2" sizes="80px" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.productId}`} className="font-semibold text-gray-800 hover:text-green-700 line-clamp-2 text-sm">{item.name}</Link>
                <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-gray-900">{formatPrice(item.sellingPrice)}</span>
                  {item.mrp > item.sellingPrice && (
                    <span className="text-xs text-gray-400 line-through">{formatPrice(item.mrp)}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end justify-between shrink-0">
                <button onClick={() => deleteItem(item.productId)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => decreaseQty(item.productId)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                  <button onClick={() => increaseQty(item.productId)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <span className="text-sm font-semibold text-gray-700">{formatPrice(item.sellingPrice * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
            <h2 className="font-bold text-gray-800 text-lg mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">GST</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-green-700">{formatPrice(total)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-5 block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-center transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link href="/products" className="mt-2 block text-center text-sm text-gray-500 hover:text-green-600">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

