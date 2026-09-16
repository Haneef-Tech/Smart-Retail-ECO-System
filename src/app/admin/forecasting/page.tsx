'use client'

import { useEffect, useState } from 'react'
import {
  Zap,
  RefreshCw,
  CheckCircle2,
  Building2,
  Truck,
  Sparkles,
  ArrowRight,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface ReorderRecommendation {
  productId: string
  sku: string
  productName: string
  categoryName: string
  supplierId: string
  supplierName: string
  supplierCode: string
  supplierLeadTime: number
  supplierRating: number
  currentStock: number
  reorderLevel: number
  safetyStock: number
  aiDecidedUnits: number
  unitCost: number
  totalOrderCost: number
  urgency: 'CRITICAL_OUT' | 'URGENT' | 'HIGH'
  aiReason: string
}

export default function AutonomousOrderingPage() {
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reorder')
      const data = await res.json()
      if (data.recommendations) setRecommendations(data.recommendations)
    } catch (err) {
      console.error('Failed to load autonomous recommendations', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  // 1-Click Admin Approval of AI Decided Units
  const handleApprovePo = async (rec: ReorderRecommendation) => {
    setApprovingId(rec.productId)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: rec.supplierId,
          productId: rec.productId,
          quantity: rec.aiDecidedUnits,
          purchasePrice: rec.unitCost,
          notes: rec.aiReason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(
          `Approved PO ${data.purchase.invoiceNumber}! Ordered ${rec.aiDecidedUnits} units of ${rec.productName} from ${rec.supplierName}. Check Supplier Delivery Status.`
        )
        // Refresh list
        await loadRecommendations()
      } else {
        alert(data.error || 'Failed to place purchase order')
      }
    } catch {
      alert('Error approving purchase order')
    } finally {
      setApprovingId(null)
    }
  }

  // Batch 1-Click Approve All
  const handleApproveAll = async () => {
    if (recommendations.length === 0) return
    setApprovingAll(true)
    setMessage(null)
    try {
      for (const rec of recommendations) {
        await fetch('/api/admin/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId: rec.supplierId,
            productId: rec.productId,
            quantity: rec.aiDecidedUnits,
            purchasePrice: rec.unitCost,
            notes: rec.aiReason,
          }),
        })
      }
      setMessage(`Approved all ${recommendations.length} AI Purchase Orders! Routed to Supplier Delivery Status.`)
      await loadRecommendations()
    } catch {
      alert('Error approving all purchase orders')
    } finally {
      setApprovingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Autonomous Ordering to Suppliers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
              AI Decides Units • Admin Approves
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Deterministic reorder engine calculates exact replenishment units; 1-click creates PO in database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {recommendations.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={approvingAll || loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              {approvingAll ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Approve All ({recommendations.length} POs)
            </button>
          )}

          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <Link
            href="/admin/purchases"
            className="shrink-0 underline font-black text-emerald-900 flex items-center gap-1"
          >
            Track Deliveries <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Recommendations Cards or Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-purple-600" />
          AI analyzing current stock levels vs reorder thresholds...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Warehouse size={36} className="mx-auto text-emerald-500 mb-2" />
          <h3 className="font-bold text-gray-900 text-base">All product inventory levels are optimal</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            There are currently zero products below their safe reorder threshold. The AI engine continuously monitors available stock.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Link
              href="/admin/inventory"
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold"
            >
              View Inventory Units
            </Link>
            <Link
              href="/admin/purchases"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
            >
              View Supplier Deliveries
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {recommendations.length} Actionable Purchase Orders Awaiting Admin Approval:
          </p>

          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.productId}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      {rec.sku}
                    </span>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {rec.categoryName}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        rec.urgency === 'CRITICAL_OUT'
                          ? 'bg-red-100 text-red-900'
                          : rec.urgency === 'URGENT'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-yellow-100 text-yellow-900'
                      }`}
                    >
                      {rec.urgency === 'CRITICAL_OUT'
                        ? 'OUT OF STOCK'
                        : rec.urgency === 'URGENT'
                        ? 'BELOW SAFETY STOCK'
                        : 'REORDER TRIGGER'}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base">{rec.productName}</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Current Stock</span>
                      <strong className="text-gray-900 font-black">{rec.currentStock} units</strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Reorder Threshold</span>
                      <span className="text-gray-700 font-semibold">{rec.reorderLevel} units</span>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
                      <span className="text-purple-700 block text-[10px] uppercase font-bold">
                        AI Decided Order
                      </span>
                      <strong className="text-purple-950 font-black text-sm">
                        +{rec.aiDecidedUnits} units
                      </strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Estimated Cost</span>
                      <strong className="text-gray-900">{formatPrice(rec.totalOrderCost)}</strong>
                    </div>
                  </div>

                  {/* Supplier & AI Reason */}
                  <div className="pt-2 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-1 font-semibold text-gray-800">
                      <Building2 size={13} className="text-blue-500" />
                      Supplier: {rec.supplierName} ({rec.supplierLeadTime}d lead time, ⭐{rec.supplierRating})
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium bg-gray-50 p-2 rounded-lg">
                    💡 <strong>AI Rationale:</strong> {rec.aiReason}
                  </p>
                </div>

                {/* 1-Click Approve PO Button */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between md:justify-center shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5 gap-3">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Total PO Value</span>
                    <span className="text-base md:text-lg font-black text-gray-900">{formatPrice(rec.totalOrderCost)}</span>
                  </div>

                  <button
                    onClick={() => handleApprovePo(rec)}
                    disabled={approvingId === rec.productId}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    {approvingId === rec.productId ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Zap size={14} />
                    )}
                    {approvingId === rec.productId ? 'Creating PO...' : '⚡ Approve & Place PO'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
