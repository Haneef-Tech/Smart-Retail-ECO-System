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
  AlertTriangle,
  Search,
  Plus,
  Minus,
  Check,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface ReorderProduct {
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
  urgency: 'CRITICAL_OUT' | 'URGENT' | 'HIGH' | 'OPTIMAL'
  aiReason: string
}

export default function AutonomousOrderingPage() {
  const [recommendations, setRecommendations] = useState<ReorderProduct[]>([])
  const [allProducts, setAllProducts] = useState<ReorderProduct[]>([])
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'recommendations' | 'all'>('recommendations')
  const [searchFilter, setSearchFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reorder')
      const data = await res.json()
      if (data.recommendations) {
        setRecommendations(data.recommendations)
        // Initialize customizable quantities
        const initQty: Record<string, number> = {}
        for (const r of data.recommendations) {
          initQty[r.productId] = r.aiDecidedUnits
        }
        setCustomQuantities(initQty)
      }
      if (data.allProducts) {
        setAllProducts(data.allProducts)
      }
    } catch (err) {
      console.error('Failed to load autonomous recommendations', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleQuantityChange = (productId: string, delta: number) => {
    setCustomQuantities((prev) => {
      const current = prev[productId] || 15
      const next = Math.max(5, current + delta)
      return { ...prev, [productId]: next }
    })
  }

  // 1-Click PO Approval
  const handleApprovePo = async (rec: ReorderProduct) => {
    setApprovingId(rec.productId)
    setMessage(null)
    const quantityToOrder = customQuantities[rec.productId] || rec.aiDecidedUnits

    try {
      const res = await fetch('/api/admin/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: rec.supplierId,
          productId: rec.productId,
          quantity: quantityToOrder,
          purchasePrice: rec.unitCost,
          notes: `Autonomous Reorder: ${quantityToOrder} units requested based on threshold ${rec.reorderLevel}.`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(
          `Success! Purchase Order ${data.purchase.invoiceNumber} created for ${quantityToOrder} units of "${rec.productName}" from ${rec.supplierName}.`
        )
        await loadData()
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
        const qty = customQuantities[rec.productId] || rec.aiDecidedUnits
        await fetch('/api/admin/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId: rec.supplierId,
            productId: rec.productId,
            quantity: qty,
            purchasePrice: rec.unitCost,
            notes: `Batch Autonomous PO: ${qty} units ordered from ${rec.supplierName}.`,
          }),
        })
      }
      setMessage(`Successfully approved all ${recommendations.length} Purchase Orders! Track deliveries under Supplier Delivery Status.`)
      await loadData()
    } catch {
      alert('Error approving all purchase orders')
    } finally {
      setApprovingAll(false)
    }
  }

  const totalRestockUnits = recommendations.reduce(
    (acc, r) => acc + (customQuantities[r.productId] || r.aiDecidedUnits),
    0
  )
  const totalEstimatedCost = recommendations.reduce(
    (acc, r) => acc + (customQuantities[r.productId] || r.aiDecidedUnits) * r.unitCost,
    0
  )
  const healthyCount = allProducts.filter((p) => p.urgency === 'OPTIMAL').length

  const filteredAllProducts = allProducts.filter((p) => {
    if (!searchFilter.trim()) return true
    const s = searchFilter.toLowerCase()
    return (
      p.productName.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      p.categoryName.toLowerCase().includes(s) ||
      p.supplierName.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold mb-2">
              <Sparkles size={13} className="text-purple-600" />
              Autonomous Inventory Replenishment
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Autonomous Ordering System
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              AI calculates exact replenishment units • Review recommendations and approve supplier purchase orders with 1 click
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {recommendations.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={approvingAll || loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                {approvingAll ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                Approve All ({recommendations.length} POs) — {formatPrice(totalEstimatedCost)}
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Stock
            </button>
          </div>
        </div>

        {/* Simple 3-Step "How It Works" Guide */}
        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50/80 rounded-2xl p-3.5 flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-black flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <strong className="text-gray-900 font-bold block">Live Stock Monitor</strong>
              <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                Watches real available units vs each item&apos;s safe reorder threshold.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-2xl p-3.5 flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <strong className="text-gray-900 font-bold block">AI Quantity Decision</strong>
              <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                Calculates optimal restock quantity factoring supplier delivery days.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-2xl p-3.5 flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <strong className="text-gray-900 font-bold block">1-Click PO Creation</strong>
              <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                Click &quot;Approve&quot; to generate the purchase order and track delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <Link
            href="/admin/purchases"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Truck size={13} /> View Supplier Delivery Status <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Reorder Needed
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
            {recommendations.length}{' '}
            <span className="text-xs font-bold text-amber-800/70">items</span>
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Below safety threshold</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Total Units to Order
          </span>
          <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">
            +{totalRestockUnits}{' '}
            <span className="text-xs font-bold text-purple-800/70">units</span>
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">AI suggested restock</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Estimated PO Cost
          </span>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
            {formatPrice(totalEstimatedCost)}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Wholesale purchase price</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Healthy SKUs
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {healthyCount} / {allProducts.length}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Well-stocked products</span>
        </div>
      </div>

      {/* Tabs: Recommendations vs All Products */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'recommendations'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <AlertTriangle size={15} />
            Action Required
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                recommendations.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {recommendations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Warehouse size={15} />
            All 25 Products Stock Status
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
              {allProducts.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div>
          {loading ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400 text-xs">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-purple-600" />
              Scanning warehouse inventory vs reorder levels...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">All Warehouse Stocks Are Optimal</h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                Zero products are currently below their safe replenishment threshold. The AI system continuously monitors real customer orders and will flag restock items automatically.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold shadow-2xs"
                >
                  View All Products
                </button>
                <Link
                  href="/admin/purchases"
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Track Inbound Deliveries
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {recommendations.length} Products Awaiting Admin PO Approval:
                </p>
                <span className="text-xs text-gray-400">
                  Tip: You can adjust quantities before clicking Approve
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {recommendations.map((rec) => {
                  const qty = customQuantities[rec.productId] || rec.aiDecidedUnits
                  const cost = qty * rec.unitCost
                  const stockPercent = Math.min(
                    100,
                    Math.round((rec.currentStock / Math.max(1, rec.reorderLevel)) * 100)
                  )

                  return (
                    <div
                      key={rec.productId}
                      className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs hover:border-purple-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      {/* Left Details */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                            {rec.sku}
                          </span>
                          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                            {rec.categoryName}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg ${
                              rec.urgency === 'CRITICAL_OUT'
                                ? 'bg-red-100 text-red-900 border border-red-200'
                                : rec.urgency === 'URGENT'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-yellow-100 text-yellow-900 border border-yellow-200'
                            }`}
                          >
                            {rec.urgency === 'CRITICAL_OUT'
                              ? 'OUT OF STOCK'
                              : rec.urgency === 'URGENT'
                              ? 'BELOW SAFETY STOCK'
                              : 'REORDER THRESHOLD REACHED'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                            {rec.productName}
                          </h3>
                        </div>

                        {/* Visual Stock Meter Bar */}
                        <div className="space-y-1.5 max-w-md">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-medium">
                              Warehouse Stock: <strong className="text-gray-900">{rec.currentStock} units</strong>
                            </span>
                            <span className="text-gray-400 text-[11px]">
                              Threshold: {rec.reorderLevel} units
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rec.currentStock === 0
                                  ? 'bg-red-500'
                                  : stockPercent < 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(5, stockPercent)}%` }}
                            />
                          </div>
                        </div>

                        {/* Supplier Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                          <span className="flex items-center gap-1.5 font-bold text-gray-800">
                            <Building2 size={14} className="text-blue-500" />
                            {rec.supplierName}
                          </span>
                          <span>Lead: {rec.supplierLeadTime} days</span>
                          <span className="text-amber-600 font-bold">⭐ {rec.supplierRating}</span>
                        </div>
                      </div>

                      {/* Right Controls & Action */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between lg:justify-center shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6 gap-4">
                        {/* Quantity Stepper */}
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold block lg:text-right mb-1">
                            Restock Quantity
                          </span>
                          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                            <button
                              onClick={() => handleQuantityChange(rec.productId, -5)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shadow-2xs"
                              title="Decrease 5 units"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-12 text-center font-black text-gray-900 text-sm">
                              +{qty}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(rec.productId, 5)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shadow-2xs"
                              title="Increase 5 units"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Total Cost Display */}
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] text-gray-400 block font-bold uppercase">
                            Purchase Order Total
                          </span>
                          <span className="text-lg sm:text-xl font-black text-gray-900">
                            {formatPrice(cost)}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            @{formatPrice(rec.unitCost)} / unit
                          </span>
                        </div>

                        {/* Approve Button */}
                        <button
                          onClick={() => handleApprovePo(rec)}
                          disabled={approvingId === rec.productId}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
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
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL 25 PRODUCTS */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Full Product Inventory Health</h3>
              <p className="text-xs text-gray-400">View real stock and reorder thresholds for all active SKUs</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search products or suppliers..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-3.5 rounded-l-xl">SKU</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-center">Current Stock</th>
                  <th className="p-3.5 text-center">Reorder Threshold</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 rounded-r-xl text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAllProducts.map((p) => (
                  <tr key={p.productId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-gray-800">{p.sku}</td>
                    <td className="p-3.5 font-bold text-gray-900">{p.productName}</td>
                    <td className="p-3.5 text-gray-600">{p.categoryName}</td>
                    <td className="p-3.5 text-center font-black text-gray-900">
                      {p.currentStock} units
                    </td>
                    <td className="p-3.5 text-center text-gray-500 font-semibold">
                      {p.reorderLevel} units
                    </td>
                    <td className="p-3.5 font-medium text-gray-700">
                      {p.supplierName} ({p.supplierLeadTime}d lead)
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          p.urgency === 'CRITICAL_OUT'
                            ? 'bg-red-100 text-red-900'
                            : p.urgency === 'URGENT' || p.urgency === 'HIGH'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.urgency === 'CRITICAL_OUT'
                          ? 'Out of Stock'
                          : p.urgency === 'URGENT' || p.urgency === 'HIGH'
                          ? 'Low Stock'
                          : 'Optimal'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleApprovePo(p)}
                        disabled={approvingId === p.productId}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                      >
                        <Zap size={11} /> Reorder +{p.aiDecidedUnits}
                      </button>
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
