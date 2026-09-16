'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatPrice, formatDateTime } from '@/lib/utils'
import type { Order } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order & { customer?: { name: string; email: string; phone: string } } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    user.getIdToken().then((token) => {
      fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { setOrder(d.order); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [user, id])

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12"><div className="bg-white rounded-2xl h-96 animate-pulse" /></div>
  if (!order) return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">Order not found.</div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-6">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>{order.status}</span>
        </div>
        {order.bill && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Bill: <span className="font-semibold text-green-700">{order.bill.billNumber}</span></span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-100 transition-colors"
            >
              <FileText size={13} /> Print Bill
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Items Ordered</h2>
        <div className="space-y-3">
          {order.orderItems?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.productName}</p>
                <p className="text-xs text-gray-400">{item.quantity} × {formatPrice(item.unitPrice)} + {(item.gstRate * 100).toFixed(0)}% GST</p>
              </div>
              <p className="font-semibold text-gray-900">{formatPrice((item.unitPrice + item.gstAmount / item.quantity) * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Bill Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.totalDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(order.totalDiscount)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatPrice(order.totalTax)}</span></div>
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>Total Paid</span><span className="text-green-700">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Delivery Address</h2>
        <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
        {order.notes && <p className="text-sm text-gray-400 mt-2 italic">“{order.notes}”</p>}
      </div>
    </div>
  )
}
