'use client'

import { useEffect, useState } from 'react'
import { formatPrice, formatDate } from '@/lib/utils'
import { CheckCircle, Truck, ShoppingBag, RefreshCw, AlertCircle } from 'lucide-react'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
}

interface OrderRecord {
  id: string
  customerId: string
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'
  subtotal: number
  totalTax: number
  total: number
  deliveryAddress: string
  createdAt: string
  customer?: { name: string; email: string; phone: string }
  bill?: { billNumber: string }
  orderItems: OrderItem[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-900 border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-900 border-blue-200',
  DELIVERED: 'bg-green-100 text-green-900 border-green-200',
  CANCELLED: 'bg-red-100 text-red-900 border-red-200',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders?admin=true', {
        headers: { Authorization: 'Bearer admin-uid' },
      })
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
    } catch (err) {
      console.error('Failed to fetch orders', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    setMessage(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        await fetchOrders()
      } else {
        alert(data.error || 'Failed to update order status')
      }
    } catch {
      alert('Failed to update order status')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredOrders = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Confirm Orders &amp; Operations</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Review customer orders, 1-click confirm status into database, and dispatch orders
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-2xs self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Orders
        </button>
      </div>

      {/* Success Notification */}
      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} /> {message}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].map((tab) => {
          const count = tab === 'ALL' ? orders.length : orders.filter((o) => o.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === tab
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-green-600" />
          Loading orders from live database...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" />
          <h3 className="font-bold text-gray-800 text-sm">No orders found in database</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            When customer orders are placed in the storefront, they will show up here for 1-click admin confirmation.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-4">Order ID &amp; Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items Ordered</th>
                  <th className="p-4">Delivery Address</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Confirm / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-gray-900 block">#{order.id.slice(0, 8)}</span>
                      <span className="text-gray-400 text-[11px]">{formatDate(order.createdAt)}</span>
                      {order.bill?.billNumber && (
                        <span className="text-[10px] text-green-700 font-semibold block mt-0.5">
                          Bill: {order.bill.billNumber}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-gray-900 block">
                        {order.customer?.name || 'Walk-in Customer'}
                      </span>
                      {order.customer?.phone && (
                        <span className="text-gray-500 text-[11px]">{order.customer.phone}</span>
                      )}
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="space-y-1">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="text-gray-700">
                            <span className="font-semibold">{item.productName}</span>{' '}
                            <span className="text-gray-400 text-[11px]">× {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-4 max-w-xs text-gray-600 truncate text-[11px]">
                      {order.deliveryAddress}
                    </td>

                    <td className="p-4">
                      <span className="font-black text-gray-900 text-sm block">
                        {formatPrice(order.total)}
                      </span>
                      <span className="text-gray-400 text-[10px]">Tax incl.</span>
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                            disabled={updatingId === order.id}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <CheckCircle size={13} />
                            {updatingId === order.id ? 'Confirming...' : 'Confirm Order'}
                          </button>
                        )}

                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            disabled={updatingId === order.id}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Truck size={13} />
                            {updatingId === order.id ? 'Updating...' : 'Mark Delivered'}
                          </button>
                        )}

                        {order.status === 'DELIVERED' && (
                          <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                            <CheckCircle size={14} /> Completed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
