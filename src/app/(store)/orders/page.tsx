'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatPrice, formatDate } from '@/lib/utils'
import type { Order } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    user.getIdToken().then((token) => {
      fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { setOrders(d.orders || []); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [user])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-24 mb-3 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">You haven't placed any orders yet.</p>
          <Link href="/products" className="mt-4 inline-block text-green-600 font-semibold">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                    <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{order.deliveryAddress}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
