'use client'

import { useEffect, useState } from 'react'
import {
  Warehouse,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Building2,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  categoryId: string
  supplier: string
  supplierId: string | null
  unit: string
  mrp: number
  sellingPrice: number
  availableQuantity: number
  reservedQuantity: number
  damagedQuantity: number
  reorderLevel: number
  safetyStock: number
  stockStatus: 'healthy' | 'low' | 'out'
}

interface CategoryOption {
  id: string
  name: string
}

interface SupplierOption {
  id: string
  code: string
  name: string
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Edit stock modal/inline state
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editQtyInput, setEditQtyInput] = useState<string>('')

  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    categoryId: '',
    supplierId: '',
    mrp: '',
    sellingPrice: '',
    unit: '1 pc',
    initialStock: '50',
    reorderLevel: '15',
    safetyStock: '5',
    description: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/inventory')
      const data = await res.json()
      if (data.products) setItems(data.products)
      if (data.categories) setCategories(data.categories)
      if (data.suppliers) setSuppliers(data.suppliers)
    } catch (err) {
      console.error('Failed to load inventory', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Quick adjust stock
  const handleQuickAdjust = async (productId: string, changeQty: number) => {
    setUpdatingId(productId)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, changeQty, reason: 'Quick Inventory Adjustment' }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        await loadData()
      } else {
        alert(data.error || 'Failed to adjust stock')
      }
    } catch {
      alert('Error updating stock')
    } finally {
      setUpdatingId(null)
    }
  }

  // Set explicit stock count
  const handleSetStock = async (productId: string) => {
    const qty = parseInt(editQtyInput)
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid non-negative number')
      return
    }

    setUpdatingId(productId)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, setQty: qty, reason: 'Exact Count Verification' }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        setEditingStockId(null)
        await loadData()
      } else {
        alert(data.error || 'Failed to update stock')
      }
    } catch {
      alert('Error updating stock')
    } finally {
      setUpdatingId(null)
    }
  }

  // Create new product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`Successfully added ${data.product.name} with ${newProduct.initialStock} units in stock!`)
        setShowAddModal(false)
        setNewProduct({
          name: '',
          sku: '',
          categoryId: '',
          supplierId: '',
          mrp: '',
          sellingPrice: '',
          unit: '1 pc',
          initialStock: '50',
          reorderLevel: '15',
          safetyStock: '5',
          description: '',
        })
        await loadData()
      } else {
        alert(data.error || 'Failed to create product')
      }
    } catch {
      alert('Error creating product')
    } finally {
      setAdding(false)
    }
  }

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      i.supplier.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  )

  const totalStockUnits = items.reduce((sum, i) => sum + i.availableQuantity, 0)
  const lowStockCount = items.filter((i) => i.availableQuantity <= i.reorderLevel).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Entry &amp; Stock Ledger</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Realtime physical available units, quick stock adjustments, and product entry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus size={15} /> Add New Product Entry
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Total Available Units</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{totalStockUnits.toLocaleString('en-IN')}</p>
          </div>
          <Warehouse size={28} className="text-emerald-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Active Products Count</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{items.length} SKUs</p>
          </div>
          <Tag size={28} className="text-blue-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase">Low Stock Threshold Items</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{lowStockCount} items</p>
          </div>
          <AlertTriangle size={28} className="text-amber-500" />
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name, SKU, category, or supplier..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-green-500 shadow-2xs"
        />
      </div>

      {/* Inventory Entry Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {/* Mobile Inventory Cards (Visible on phones < md) */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map((item) => (
            <div key={item.id} className="p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                      {item.sku}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200/60">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mt-1.5">{item.name}</h4>
                  <span className="text-gray-400 text-xs">{item.unit}</span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-gray-900 text-sm block">
                    {formatPrice(item.sellingPrice)}
                  </span>
                  {item.mrp > item.sellingPrice && (
                    <span className="text-[10px] text-gray-400 line-through block">
                      MRP {formatPrice(item.mrp)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                <span className="inline-flex items-center gap-1">
                  <Building2 size={12} className="text-gray-400" />
                  {item.supplier}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  Reorder at: <strong className="text-gray-700">{item.reorderLevel} units</strong>
                </span>
              </div>

              {/* Stock Counter and Quick Adjustments */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Stock:</span>
                  {editingStockId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={editQtyInput}
                        onChange={(e) => setEditQtyInput(e.target.value)}
                        className="w-16 px-2 py-1 border border-green-500 rounded-lg text-center font-bold text-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSetStock(item.id)}
                        className="px-2 py-1 bg-green-600 text-white rounded-lg text-[10px] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingStockId(null)}
                        className="px-1.5 py-1 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingStockId(item.id)
                        setEditQtyInput(String(item.availableQuantity))
                      }}
                      title="Click to manually edit exact stock units"
                      className={`px-3 py-1 rounded-md font-black text-xs transition-colors ${
                        item.availableQuantity <= item.reorderLevel
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {item.availableQuantity} units ✎
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleQuickAdjust(item.id, 10)}
                    disabled={updatingId === item.id}
                    className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 font-bold rounded-lg text-[11px] border border-green-200 transition-colors"
                    title="Add 10 units"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(item.id, 25)}
                    disabled={updatingId === item.id}
                    className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 font-bold rounded-lg text-[11px] border border-green-200 transition-colors"
                    title="Add 25 units"
                  >
                    +25
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(item.id, -5)}
                    disabled={updatingId === item.id || item.availableQuantity < 5}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[11px] border border-red-200 transition-colors disabled:opacity-30"
                    title="Subtract 5 units"
                  >
                    -5
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (Visible on screens >= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="p-4">SKU / ID</th>
                <th className="p-4">Product Name &amp; Unit</th>
                <th className="p-4">Category</th>
                <th className="p-4">Supplier</th>
                <th className="p-4 text-right">Selling Price</th>
                <th className="p-4 text-center">Available Units</th>
                <th className="p-4 text-center">Reorder Level</th>
                <th className="p-4 text-right">Quick Stock Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-mono font-bold text-gray-900">{item.sku}</td>

                  <td className="p-4">
                    <span className="font-bold text-gray-900 block">{item.name}</span>
                    <span className="text-gray-400 text-[11px]">{item.unit}</span>
                  </td>

                  <td className="p-4 text-gray-600 font-medium">{item.category}</td>

                  <td className="p-4 text-gray-700 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Building2 size={12} className="text-gray-400" />
                      {item.supplier}
                    </span>
                  </td>

                  <td className="p-4 text-right font-bold text-gray-900">
                    {formatPrice(item.sellingPrice)}
                  </td>

                  <td className="p-4 text-center">
                    {editingStockId === item.id ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          value={editQtyInput}
                          onChange={(e) => setEditQtyInput(e.target.value)}
                          className="w-16 px-2 py-1 border border-green-500 rounded-lg text-center font-bold text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSetStock(item.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingStockId(null)}
                          className="px-1.5 py-1 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingStockId(item.id)
                          setEditQtyInput(String(item.availableQuantity))
                        }}
                        title="Click to manually edit exact stock units"
                        className={`px-3 py-1 rounded-md font-black text-xs transition-colors ${
                          item.availableQuantity <= item.reorderLevel
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {item.availableQuantity} units ✎
                      </button>
                    )}
                  </td>

                  <td className="p-4 text-center text-gray-500 font-semibold">
                    {item.reorderLevel}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleQuickAdjust(item.id, 10)}
                        disabled={updatingId === item.id}
                        className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-800 font-bold rounded-lg text-[11px] border border-green-200 transition-colors"
                        title="Add 10 units to stock"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item.id, 25)}
                        disabled={updatingId === item.id}
                        className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-800 font-bold rounded-lg text-[11px] border border-green-200 transition-colors"
                        title="Add 25 units to stock"
                      >
                        +25
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item.id, -5)}
                        disabled={updatingId === item.id || item.availableQuantity < 5}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[11px] border border-red-200 transition-colors disabled:opacity-30"
                        title="Subtract 5 units (breakage/shrinkage)"
                      >
                        -5
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Plus size={18} className="text-green-600" />
                Add New Product Entry
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. Head & Shoulders Shampoo"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="e.g. P026 (Optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    placeholder="e.g. 1 L, 500 g, 1 pc"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Primary Supplier</label>
                  <select
                    value={newProduct.supplierId}
                    onChange={(e) => setNewProduct({ ...newProduct, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  >
                    <option value="">Select Supplier (1 of 10)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.mrp}
                    onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                    placeholder="e.g. 350"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                    placeholder="e.g. 315"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Initial Available Units *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.initialStock}
                    onChange={(e) => setNewProduct({ ...newProduct, initialStock: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorderLevel}
                    onChange={(e) => setNewProduct({ ...newProduct, reorderLevel: e.target.value })}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  {adding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  {adding ? 'Saving...' : 'Save Product Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
