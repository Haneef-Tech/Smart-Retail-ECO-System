'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, CheckCircle, XCircle, Search, Filter, ShieldAlert } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface ProductItem {
  id: string
  sku: string
  name: string
  category: string
  categoryId: string
  brand?: string
  mrp: number
  sellingPrice: number
  taxRate: number
  stock: number
  availableQuantity: number
  reservedQuantity: number
  damagedQuantity: number
  reorderLevel: number
  safetyStock: number
  leadTimeDays: number
  isActive: boolean
  unit: string
  supplier?: { name: string } | null
  supplierId?: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [loading, setLoading] = useState(true)

  // Edit Modal State
  const [editingProd, setEditingProd] = useState<ProductItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Create Modal State
  const [showCreate, setShowCreate] = useState(false)
  const [newProd, setNewProd] = useState({
    sku: '',
    name: '',
    categoryId: '',
    brand: '',
    mrp: '',
    sellingPrice: '',
    unit: '1 pc',
    reorderLevel: '10',
    safetyStock: '5',
    leadTimeDays: '3',
    supplierId: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [pRes, gRes, sRes] = await Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/gst').then((r) => r.json()),
      fetch('/api/admin/suppliers').then((r) => r.json()),
    ])
    setProducts(pRes.products || [])
    if (gRes.rates) {
      setCategories(gRes.rates.map((r: { category: string }) => ({ id: r.category, name: r.category })))
    }
    setSuppliers(sRes.suppliers || [])
    setLoading(false)
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCat ? p.category === selectedCat : true
    return matchSearch && matchCat
  })

  const handleToggleActive = async (p: ProductItem) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, isActive: !item.isActive } : item)))
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProd) return
    setSaving(true)
    await fetch(`/api/products/${editingProd.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProd),
    })
    setSaving(false)
    setEditingProd(null)
    loadData()
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd),
    })
    setSaving(false)
    setShowCreate(false)
    setNewProd({
      sku: '',
      name: '',
      categoryId: '',
      brand: '',
      mrp: '',
      sellingPrice: '',
      unit: '1 pc',
      reorderLevel: '10',
      safetyStock: '5',
      leadTimeDays: '3',
      supplierId: '',
    })
    loadData()
  }

  if (loading) return <div className="p-6"><div className="bg-white rounded-2xl h-96 animate-pulse" /></div>

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management ({products.length})</h1>
          <p className="text-sm text-gray-500">Configure prices, reorder thresholds, safety stock & supplier mappings</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:border-green-500 w-full">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or Product Name…"
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">SKU / ID</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">MRP / Price</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Reorder</th>
              <th className="px-4 py-3">Safety</th>
              <th className="px-4 py-3">Lead Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-green-700 text-xs">{p.sku}</td>
                <td className="px-4 py-3 font-semibold text-gray-800 max-w-xs truncate">{p.name}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-900">{formatPrice(p.sellingPrice)}</span>
                  <span className="text-xs text-gray-400 block line-through">{formatPrice(p.mrp)}</span>
                </td>
                <td className="px-4 py-3 font-bold">{p.availableQuantity}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.reorderLevel}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.safetyStock}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.leadTimeDays} days</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {p.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {p.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditingProd(p)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingProd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Edit Product — {editingProd.sku}</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Product Name</label>
                <input
                  value={editingProd.name}
                  onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  value={editingProd.sellingPrice}
                  onChange={(e) => setEditingProd({ ...editingProd, sellingPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Reorder Level</label>
                <input
                  type="number"
                  value={editingProd.reorderLevel}
                  onChange={(e) => setEditingProd({ ...editingProd, reorderLevel: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Safety Stock</label>
                <input
                  type="number"
                  value={editingProd.safetyStock}
                  onChange={(e) => setEditingProd({ ...editingProd, safetyStock: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  value={editingProd.leadTimeDays}
                  onChange={(e) => setEditingProd({ ...editingProd, leadTimeDays: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProd(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-xs"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubmit} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Create New Product</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">SKU *</label>
                <input
                  value={newProd.sku}
                  onChange={(e) => setNewProd({ ...newProd, sku: e.target.value.toUpperCase() })}
                  required
                  placeholder="P026"
                  className="w-full p-2 border rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Product Name *</label>
                <input
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  required
                  placeholder="Organic Honey"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  value={newProd.sellingPrice}
                  onChange={(e) => setNewProd({ ...newProd, sellingPrice: e.target.value })}
                  required
                  placeholder="150"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">MRP (₹) *</label>
                <input
                  type="number"
                  value={newProd.mrp}
                  onChange={(e) => setNewProd({ ...newProd, mrp: e.target.value })}
                  required
                  placeholder="180"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-xs"
              >
                {saving ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
