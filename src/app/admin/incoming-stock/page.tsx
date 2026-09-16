'use client'

import { useState, useEffect } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText, Plus, RefreshCw, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface ProductOption {
  id: string
  sku: string
  name: string
}

interface SupplierOption {
  id: string
  code: string
  name: string
}

interface ValidationSummary {
  rowsReceived: number
  validRowsCount: number
  invalidRowsCount: number
  errors: { row: number; sku: string; message: string }[]
  validRows: { rowNumber: number; sku: string; productName: string; quantity: number; purchasePrice: number }[]
}

export default function IncomingStockPage() {
  const [tab, setTab] = useState<'csv' | 'manual'>('csv')
  const [products, setProducts] = useState<ProductOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  
  // CSV State
  const [csvText, setCsvText] = useState('')
  const [validating, setValidating] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null)

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    purchasePrice: '',
    invoiceNumber: '',
    notes: '',
  })
  const [manualLoading, setManualLoading] = useState(false)
  const [manualSuccess, setManualSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
    fetch('/api/admin/suppliers')
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers || []))
  }, [])

  // Sample CSV template generator
  const loadSampleCsv = () => {
    const sample = `sku,product_name,quantity,purchase_price,supplier
P018,Skybags School Bag,100,550,S005
P019,Classmate Notebook,250,42,S005
P020,Reynolds Pen Pack,300,35,S005
P001,India Gate Basmati Rice,50,220,S001`
    setCsvText(sample)
    setSummary(null)
    setCommitSuccess(null)
  }

  // Validate CSV
  const handleValidateCsv = async () => {
    if (!csvText.trim()) return
    setValidating(true)
    setSummary(null)
    setCommitSuccess(null)
    try {
      const res = await fetch('/api/admin/incoming-stock/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, action: 'validate' }),
      })
      const data = await res.json()
      setSummary(data)
    } catch {
      alert('Validation request failed.')
    } finally {
      setValidating(false)
    }
  }

  // Commit Batch
  const handleCommitBatch = async () => {
    if (!summary || summary.invalidRowsCount > 0) return
    setCommitting(true)
    try {
      const res = await fetch('/api/admin/incoming-stock/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, action: 'commit' }),
      })
      const data = await res.json()
      if (res.ok) {
        setCommitSuccess(`Successfully imported ${data.importedCount} items! (Invoice: ${data.invoiceNumber})`)
        setSummary(null)
        setCsvText('')
      } else {
        alert(data.error || 'Failed to commit batch.')
      }
    } catch {
      alert('Commit request failed.')
    } finally {
      setCommitting(false)
    }
  }

  // Manual stock submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualLoading(true)
    setManualSuccess(false)
    try {
      const res = await fetch('/api/admin/incoming-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      })
      if (res.ok) {
        setManualSuccess(true)
        setManualForm({ productId: '', supplierId: '', quantity: '', purchasePrice: '', invoiceNumber: '', notes: '' })
        setTimeout(() => setManualSuccess(false), 3000)
      } else {
        alert('Failed to add incoming stock.')
      }
    } catch {
      alert('Request error.')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incoming Stock Management</h1>
          <p className="text-sm text-gray-500">Restock inventory manually or via multi-stage CSV ingestion pipeline</p>
        </div>
        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setTab('csv')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'csv' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            CSV Ingestion Pipeline
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'manual' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {tab === 'csv' && (
        <div className="space-y-6">
          {commitSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center gap-3">
              <CheckCircle size={20} />
              <span className="font-semibold text-sm">{commitSuccess}</span>
            </div>
          )}

          {/* Step 1: Input CSV */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-base">Step 1: Upload or Paste CSV Data</h2>
              <button
                onClick={loadSampleCsv}
                className="text-xs text-green-600 font-semibold hover:underline flex items-center gap-1"
              >
                <FileText size={13} /> Load Sample CSV
              </button>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value)
                setSummary(null)
              }}
              rows={6}
              placeholder={`sku,product_name,quantity,purchase_price,supplier\nP018,Skybags School Bag,100,550,S005\nP019,Classmate Notebook,250,42,S005`}
              className="w-full p-4 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-green-500 bg-gray-50"
            />

            <div className="flex justify-end">
              <button
                onClick={handleValidateCsv}
                disabled={validating || !csvText.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
              >
                {validating ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                Validate CSV File
              </button>
            </div>
          </div>

          {/* Step 2: Validation Results Screen */}
          {summary && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
              <h2 className="font-bold text-gray-800 text-base">Step 2: CSV Validation Pipeline Results</h2>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Rows Received</p>
                  <p className="text-xl font-bold text-gray-800">{summary.rowsReceived}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-600">Valid Rows</p>
                  <p className="text-xl font-bold text-green-700">{summary.validRowsCount}</p>
                </div>
                <div className={`rounded-xl p-3 ${summary.invalidRowsCount > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-400'}`}>
                  <p className="text-xs">Invalid Rows</p>
                  <p className="text-xl font-bold">{summary.invalidRowsCount}</p>
                </div>
              </div>

              {/* Errors List */}
              {summary.errors.length > 0 && (
                <div className="border border-red-200 bg-red-50/50 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-red-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={15} /> Validation Errors Found ({summary.errors.length}):
                  </p>
                  <ul className="space-y-1.5 text-xs text-red-600 font-mono">
                    {summary.errors.map((err, i) => (
                      <li key={i} className="bg-white p-2 rounded-lg border border-red-100">
                        <span className="font-bold">Row {err.row}</span> ({err.sku}): {err.message}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-500 mt-2 italic">
                    ⚠️ Batch import is blocked until all row errors are resolved.
                  </p>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {summary.validRows.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 text-xs uppercase mb-2">Valid Items Preview ({summary.validRows.length}):</p>
                  <div className="border rounded-xl overflow-hidden text-xs max-h-52 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Product Name</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {summary.validRows.map((r) => (
                          <tr key={r.rowNumber}>
                            <td className="p-2 text-gray-400">#{r.rowNumber}</td>
                            <td className="p-2 font-mono font-bold text-green-700">{r.sku}</td>
                            <td className="p-2 font-medium">{r.productName}</td>
                            <td className="p-2 font-bold">{r.quantity}</td>
                            <td className="p-2">{formatPrice(r.purchasePrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Admin Confirmation Commit */}
              <div className="pt-3 border-t flex justify-end">
                <button
                  onClick={handleCommitBatch}
                  disabled={committing || summary.invalidRowsCount > 0}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  {committing ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Commit Valid Batch to Inventory ({summary.validRowsCount} items)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          {manualSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold">
              ✓ Stock added successfully!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
              <select
                value={manualForm.productId}
                onChange={(e) => setManualForm((f) => ({ ...f, productId: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select
                value={manualForm.supplierId}
                onChange={(e) => setManualForm((f) => ({ ...f, supplierId: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                value={manualForm.quantity}
                onChange={(e) => setManualForm((f) => ({ ...f, quantity: e.target.value }))}
                required
                placeholder="100"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price per Unit (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualForm.purchasePrice}
                onChange={(e) => setManualForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                required
                placeholder="250.00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice / Reference Number</label>
            <input
              value={manualForm.invoiceNumber}
              onChange={(e) => setManualForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
              placeholder="PO-2026-0091 (optional)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={manualLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} /> {manualLoading ? 'Adding Stock...' : 'Add Stock Record'}
          </button>
        </form>
      )}
    </div>
  )
}

