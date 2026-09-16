'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { RefreshCw, Play, AlertTriangle, CheckCircle2, TrendingUp, Archive, Zap } from 'lucide-react'

interface CoverageItem {
  id: string
  productId: string
  sku: string
  productName: string
  categoryName: string
  availableStock: number
  reorderLevel: number
  leadTimeDays: number
  unitsSold30Days: number
  avgDailySales: number
  stockCoverageDays: number
  velocityClass: string
  riskLevel: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'OVERSTOCK' | 'DEAD_STOCK'
  supplierName: string
  sellingPrice: number
}

interface CoverageSummary {
  totalProducts: number
  criticalCount: number
  lowCount: number
  healthyCount: number
  overstockCount: number
  deadStockCount: number
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [etlRunning, setEtlRunning] = useState(false)
  const [etlMessage, setEtlMessage] = useState('')
  const [summary, setSummary] = useState<CoverageSummary | null>(null)
  const [items, setItems] = useState<CoverageItem[]>([])
  const [filter, setFilter] = useState<string>('ALL')

  const fetchCoverage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/coverage')
      const data = await res.json()
      if (data.items) {
        setItems(data.items)
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to fetch coverage', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoverage()
  }, [])

  const handleRunEtl = async () => {
    setEtlRunning(true)
    setEtlMessage('')
    try {
      const res = await fetch('/api/admin/etl/run', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setEtlMessage(`ETL Success! Evaluated ${data.data.performanceEvaluated} products, created ${data.data.snapshotsCreated} snapshots.`)
        await fetchCoverage()
      } else {
        setEtlMessage(`ETL Error: ${data.error}`)
      }
    } catch (err) {
      setEtlMessage('Failed to trigger ETL pipeline.')
    } finally {
      setEtlRunning(false)
    }
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'ALL') return true
    return item.riskLevel === filter
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Stock Coverage Reports</h1>
          <p className="text-sm text-gray-500">
            Daily ETL pipeline, inventory snapshots &amp; Stock Coverage formula (Stock Coverage = Available Stock / Avg Daily Sales)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCoverage}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={handleRunEtl}
            disabled={etlRunning}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            {etlRunning ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Run Daily ETL Pipeline
          </button>
        </div>
      </div>

      {etlMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <span>{etlMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            onClick={() => setFilter('ALL')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              filter === 'ALL' ? 'bg-green-50 border-green-300 ring-2 ring-green-100' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Catalog</span>
              <Archive size={16} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{summary.totalProducts}</p>
          </div>

          <div
            onClick={() => setFilter('CRITICAL')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              filter === 'CRITICAL' ? 'bg-red-50 border-red-300 ring-2 ring-red-100' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-600 uppercase">Critical Coverage</span>
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{summary.criticalCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">&lt; 7 Days stock left</p>
          </div>

          <div
            onClick={() => setFilter('LOW')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              filter === 'LOW' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-100' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase">Low Coverage</span>
              <Zap size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">{summary.lowCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">7-14 Days stock left</p>
          </div>

          <div
            onClick={() => setFilter('OVERSTOCK')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              filter === 'OVERSTOCK' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 uppercase">Overstock</span>
              <TrendingUp size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{summary.overstockCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">&gt; 60 Days coverage</p>
          </div>

          <div
            onClick={() => setFilter('DEAD_STOCK')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              filter === 'DEAD_STOCK' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-100' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600 uppercase">Dead Stock</span>
              <Archive size={16} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">{summary.deadStockCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">0 sales in 30 days</p>
          </div>
        </div>
      )}

      {/* Stock Coverage Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">Product Stock Coverage & Sales Velocity Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Calculated using 30-day historical order velocity and current available warehouse inventory.
            </p>
          </div>
          {filter !== 'ALL' && (
            <button onClick={() => setFilter('ALL')} className="text-xs text-green-600 font-semibold hover:underline">
              Show All Products ({items.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="p-3">SKU & Product</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Available Stock</th>
                <th className="p-3 text-right">30-Day Units</th>
                <th className="p-3 text-right">Daily Velocity</th>
                <th className="p-3 text-right">Stock Coverage</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Loading Stock Coverage metrics...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No products matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-bold text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.sku} • {item.supplierName}</p>
                    </td>
                    <td className="p-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium">
                        {item.categoryName}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">{item.availableStock} pcs</td>
                    <td className="p-3 text-right text-gray-600">{item.unitsSold30Days}</td>
                    <td className="p-3 text-right font-medium text-gray-800">{item.avgDailySales} / day</td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-gray-900">
                        {item.stockCoverageDays > 365 ? '> 365' : item.stockCoverageDays} Days
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold inline-block ${
                          item.riskLevel === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : item.riskLevel === 'LOW'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : item.riskLevel === 'OVERSTOCK'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : item.riskLevel === 'DEAD_STOCK'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
