'use client'

import { useEffect, useState } from 'react'
import {
  Truck,
  CheckCircle2,
  RefreshCw,
  Clock,
  Building2,
  PackageCheck,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { formatPrice, formatDate } from '@/lib/utils'

interface PurchaseItem {
  id: string
  productId: string
  quantity: number
  purchasePrice: number
  subtotal: number
  product: {
    id: string
    sku: string
    name: string
    unit: string
  }
}

interface PurchaseOrder {
  id: string
  invoiceNumber: string
  supplierId: string
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  expectedDelivery: string | null
  createdAt: string
  notes: string | null
  supplier: {
    id: string
    code: string
    name: string
    phone: string | null
    leadTimeDays: number
    rating: number
  }
  purchaseItems: PurchaseItem[]
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Order Placed (Pending Dispatch)', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  IN_TRANSIT: { label: 'In-Transit 🚚', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  DELIVERED: { label: 'Delivered & Stock Received ✓', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-900 border-red-200' },
}

export default function SupplierDeliveriesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadPurchases = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/purchases')
      const data = await res.json()
      if (data.purchases) setPurchases(data.purchases)
    } catch (err) {
      console.error('Failed to load purchases', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPurchases()
  }, [])

  const handleUpdateStatus = async (purchaseId: string, status: string) => {
    setUpdatingId(purchaseId)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/purchases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, status }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || `Purchase order status updated to ${status}!`)
        await loadPurchases()
      } else {
        alert(data.error || 'Failed to update delivery status')
      }
    } catch {
      alert('Error updating delivery status')
    } finally {
      setUpdatingId(null)
    }
  }

  const pendingCount = purchases.filter((p) => p.status === 'PENDING').length
  const inTransitCount = purchases.filter((p) => p.status === 'IN_TRANSIT').length
  const deliveredCount = purchases.filter((p) => p.status === 'DELIVERED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supplier Delivery Status &amp; Inbound Stock
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track wholesale shipments from 10 suppliers; receive incoming stock directly into database inventory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/forecasting"
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Zap size={14} /> Autonomous Reorder
          </Link>
          <button
            onClick={loadPurchases}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase">Pending Supplier Dispatch</p>
            <p className="text-2xl font-black text-amber-800 mt-0.5">{pendingCount} POs</p>
          </div>
          <Clock size={28} className="text-amber-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-blue-700 uppercase">Shipments In-Transit</p>
            <p className="text-2xl font-black text-blue-800 mt-0.5">{inTransitCount} POs</p>
          </div>
          <Truck size={28} className="text-blue-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase">Delivered &amp; Restocked</p>
            <p className="text-2xl font-black text-emerald-800 mt-0.5">{deliveredCount} POs</p>
          </div>
          <PackageCheck size={28} className="text-emerald-500" />
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* Purchase Orders Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-green-600" />
          Loading supplier shipments...
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Truck size={36} className="mx-auto text-gray-300 mb-2" />
          <h3 className="font-bold text-gray-800 text-base">No active supplier purchase orders</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            When you approve reorders in Autonomous Ordering, supplier purchase orders will appear here for tracking and receiving.
          </p>
          <Link
            href="/admin/forecasting"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-xs"
          >
            <Zap size={14} /> Go to Autonomous Ordering
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Mobile Card List (Visible on phones < md) */}
          <div className="md:hidden divide-y divide-gray-100">
            {purchases.map((po) => {
              const badge = STATUS_BADGES[po.status] || { label: po.status, color: 'bg-gray-100 text-gray-800' }
              return (
                <div key={po.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-gray-900 text-sm">#{po.invoiceNumber}</span>
                      <span className="text-gray-400 text-[11px] block">{formatDate(po.createdAt)}</span>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-xs bg-gray-50/80 p-3 rounded-xl space-y-1">
                    <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                      <Building2 size={13} className="text-gray-400" />
                      {po.supplier.name}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono block">
                      [{po.supplier.code}] {po.supplier.phone || ''}
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      Delivery: {po.expectedDelivery ? formatDate(po.expectedDelivery) : '1-2 business days'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items Ordered:</p>
                    <div className="bg-gray-50/50 rounded-xl p-2.5 space-y-1 border border-gray-100">
                      {po.purchaseItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-gray-800">
                          <span className="font-medium truncate mr-2">{item.product.name}</span>
                          <span className="text-green-700 font-bold shrink-0">{item.quantity} units</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Total PO Value</span>
                      <span className="font-black text-gray-900 text-base">{formatPrice(po.totalAmount)}</span>
                    </div>

                    <div>
                      {po.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(po.id, 'IN_TRANSIT')}
                          disabled={updatingId === po.id}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Truck size={13} />
                          {updatingId === po.id ? 'Updating...' : 'Mark In-Transit'}
                        </button>
                      )}

                      {po.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => handleUpdateStatus(po.id, 'DELIVERED')}
                          disabled={updatingId === po.id}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <PackageCheck size={14} />
                          {updatingId === po.id ? 'Restocking...' : 'Receive Stock'}
                        </button>
                      )}

                      {po.status === 'DELIVERED' && (
                        <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={14} /> Added to Inventory
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table (Visible on screens >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-4">PO Number &amp; Date</th>
                  <th className="p-4">Supplier Details</th>
                  <th className="p-4">Items &amp; Units Ordered</th>
                  <th className="p-4">Total PO Value</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4 text-center">Delivery Status</th>
                  <th className="p-4 text-right">Receive Stock / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((po) => {
                  const badge = STATUS_BADGES[po.status] || { label: po.status, color: 'bg-gray-100 text-gray-800' }
                  return (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-gray-900 block">{po.invoiceNumber}</span>
                        <span className="text-gray-400 text-[11px]">{formatDate(po.createdAt)}</span>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-gray-900 block flex items-center gap-1">
                          <Building2 size={13} className="text-gray-400" />
                          {po.supplier.name}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          [{po.supplier.code}] {po.supplier.phone}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          {po.purchaseItems.map((item) => (
                            <div key={item.id} className="text-gray-800">
                              <strong className="text-green-700">{item.quantity} units</strong> of {item.product.name}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-4 font-black text-gray-900 text-sm">
                        {formatPrice(po.totalAmount)}
                      </td>

                      <td className="p-4 text-gray-600 text-[11px]">
                        {po.expectedDelivery ? formatDate(po.expectedDelivery) : '1-2 business days'}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {po.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'IN_TRANSIT')}
                              disabled={updatingId === po.id}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <Truck size={12} />
                              {updatingId === po.id ? 'Updating...' : 'Mark In-Transit'}
                            </button>
                          )}

                          {po.status === 'IN_TRANSIT' && (
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'DELIVERED')}
                              disabled={updatingId === po.id}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <PackageCheck size={14} />
                              {updatingId === po.id ? 'Restocking...' : 'Receive Stock'}
                            </button>
                          )}

                          {po.status === 'DELIVERED' && (
                            <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={14} /> Added to Inventory
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

