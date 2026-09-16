'use client'

import { useState, useEffect } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Database,
  Trash2,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface SaleRecord {
  id: string
  date: string
  sku: string | null
  productName: string
  category: string | null
  quantity: number
  unitPrice: number
  totalRevenue: number
  paymentMode: string
}

const SAMPLE_CSV = `date,product_name,sku,category,quantity,unit_price,total_revenue,payment_mode
2026-09-01,India Gate Basmati Rice,P001,Grocery,12,289,3468,UPI
2026-09-01,Amul Fresh Milk,P007,Dairy,25,68,1700,CASH
2026-09-01,Britannia Marie Biscuits,P005,Snacks,18,30,540,UPI
2026-09-02,Maggi 2-Minute Noodles,P006,Snacks,40,12,480,UPI
2026-09-02,Aashirvaad Wheat Flour,P002,Grocery,10,249,2490,CARD
2026-09-02,Tata Tea Premium,P010,Beverages,8,299,2392,UPI
2026-09-03,Head & Shoulders Shampoo,P012,Personal Care,5,315,1575,UPI
2026-09-03,Skybags School Bag,P018,Accessories,3,999,2997,CARD
2026-09-03,Fortune Sunflower Oil,P003,Grocery,14,165,2310,CASH
2026-09-04,Modern Sandwich Bread,P008,Bakery,15,40,600,CASH
2026-09-04,Farm Fresh Eggs,P009,Dairy,20,80,1600,UPI
2026-09-04,Classmate Ruled Notebook,P019,Stationery,22,52,1144,UPI
2026-09-05,Reynolds Ball Pen Pack,P020,Stationery,15,70,1050,CASH
2026-09-05,Milton Steel Lunch Box,P021,Accessories,4,399,1596,UPI
2026-09-05,Colgate Strong Teeth Toothpaste,P013,Personal Care,9,105,945,UPI`

export default function SalesUploadPage() {
  const [csvText, setCsvText] = useState('')
  const [records, setRecords] = useState<SaleRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalUnitsSold, setTotalUnitsSold] = useState(0)
  const [ragDocsCount, setRagDocsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadSalesData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sales/upload')
      const data = await res.json()
      if (data.records) setRecords(data.records)
      setTotalCount(data.totalCount || 0)
      setTotalRevenue(data.totalRevenue || 0)
      setTotalUnitsSold(data.totalUnitsSold || 0)
      setRagDocsCount(data.ragDocsCount || 0)
    } catch (err) {
      console.error('Failed to load sales data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSalesData()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvText(content)
    }
    reader.readAsText(file)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvText.trim()) {
      alert('Please provide or paste CSV sales data')
      return
    }

    setUploading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/sales/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawCsv: csvText }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        setCsvText('')
        await loadSalesData()
      } else {
        alert(data.error || 'Failed to upload sales data')
      }
    } catch {
      alert('Error uploading sales data')
    } finally {
      setUploading(false)
    }
  }

  const handleClearSales = async () => {
    if (!confirm('Are you sure you want to clear all uploaded sales data and RAG facts?')) return
    setClearing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/sales/upload', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        await loadSalesData()
      }
    } catch {
      alert('Error clearing sales data')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Store Sales Upload &amp; RAG Training</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
              AI Knowledge Ingestion
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Upload your store sales data (CSV) to automatically train the AI Assistant for accurate sales Q&amp;A
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/ai"
            className="bg-gray-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Sparkles size={14} /> Open AI Assistant <ArrowRight size={12} />
          </Link>
          <button
            onClick={loadSalesData}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* RAG & Ingestion Status Banner */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          <Link href="/admin/ai" className="underline font-black text-emerald-900">
            Ask AI Assistant →
          </Link>
        </div>
      )}

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Uploaded Revenue</span>
          <p className="text-2xl font-black text-green-700 mt-1">{formatPrice(totalRevenue)}</p>
          <span className="text-[11px] text-gray-500 font-medium">From uploaded store records</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Units Sold</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalUnitsSold.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-gray-500 font-medium">Aggregated across all SKUs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Transactions Count</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalCount} rows</p>
          <span className="text-[11px] text-gray-500 font-medium">Logged in database</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">RAG Trained Docs</span>
          <p className="text-2xl font-black text-purple-600 mt-1">{ragDocsCount} indexed</p>
          <span className="text-[11px] text-purple-700 font-medium">Directly accessible by AI Assistant</span>
        </div>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
          <div className="flex items-center gap-2">
            <UploadCloud size={20} className="text-green-600" />
            <h2 className="font-bold text-gray-900 text-sm">Upload Sales CSV Data</h2>
          </div>

          <button
            type="button"
            onClick={() => setCsvText(SAMPLE_CSV)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <FileSpreadsheet size={13} /> Load Sample Store Sales (15 Items)
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Chooser */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-green-400 transition-colors flex flex-col items-center justify-center bg-gray-50/50">
              <UploadCloud size={32} className="text-gray-400 mb-2" />
              <p className="text-xs font-bold text-gray-700">Choose CSV or drag file here</p>
              <p className="text-[11px] text-gray-400 mt-1">Supports standard CSV exports (.csv)</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-3 text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
              />
            </div>

            {/* Direct CSV Paste */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Or Paste CSV Raw Text:
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="date,product_name,sku,category,quantity,unit_price,total_revenue,payment_mode..."
                rows={6}
                className="w-full p-3 font-mono text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50/30"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3">
            <span className="text-[11px] text-gray-400">
              Format: <code>date, product_name, sku, category, quantity, unit_price, total_revenue, payment_mode</code>
            </span>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearSales}
                  disabled={clearing}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 size={13} /> {clearing ? 'Clearing...' : 'Clear Sales Data'}
                </button>
              )}

              <button
                type="submit"
                disabled={uploading || !csvText.trim()}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {uploading ? 'Ingesting & Training RAG...' : 'Upload & Train AI Assistant'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Uploaded Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">
              Uploaded Store Sales Records ({records.length} shown)
            </h3>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            Trained into AI RAG Knowledge Layer
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs">
            No store sales uploaded yet. Upload your CSV above or click &quot;Load Sample Store Sales&quot; to test.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-center">Units Sold</th>
                  <th className="p-3.5 text-right">Unit Price</th>
                  <th className="p-3.5 text-right">Total Revenue</th>
                  <th className="p-3.5 text-center">Payment Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 font-mono text-gray-500">{r.date}</td>
                    <td className="p-3.5 font-bold text-gray-900">
                      {r.productName}
                      {r.sku && <span className="text-gray-400 text-[10px] ml-1.5 font-mono">[{r.sku}]</span>}
                    </td>
                    <td className="p-3.5 text-gray-600">{r.category || 'General'}</td>
                    <td className="p-3.5 text-center font-black text-gray-900">{r.quantity}</td>
                    <td className="p-3.5 text-right font-medium text-gray-700">{formatPrice(r.unitPrice)}</td>
                    <td className="p-3.5 text-right font-bold text-green-700">
                      {formatPrice(r.totalRevenue)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-gray-100 text-gray-700">
                        {r.paymentMode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

