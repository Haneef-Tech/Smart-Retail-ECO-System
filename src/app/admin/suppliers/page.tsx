'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  CheckCircle2,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface ProductPreview {
  id: string
  sku: string
  name: string
  unit: string
  sellingPrice: number
  inventory?: { availableQuantity: number }
}

interface Supplier {
  id: string
  code: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  categories?: string
  rating: number
  leadTimeDays: number
  _count?: { products: number; purchases: number }
  products?: ProductPreview[]
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [form, setForm] = useState({
    code: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    categories: '',
    leadTimeDays: '2',
    rating: '4.8',
  })

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/suppliers')
      const data = await res.json()
      if (data.suppliers) setSuppliers(data.suppliers)
    } catch (err) {
      console.error('Failed to load suppliers', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.supplier) {
        setMessage(`Successfully registered supplier ${data.supplier.name} [${data.supplier.code}]`)
        setShowAddModal(false)
        setForm({
          code: '',
          name: '',
          contactName: '',
          email: '',
          phone: '',
          address: '',
          categories: '',
          leadTimeDays: '2',
          rating: '4.8',
        })
        await loadSuppliers()
      } else {
        alert(data.error || 'Failed to create supplier')
      }
    } catch {
      alert('Error saving supplier')
    } finally {
      setSaving(false)
    }
  }

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.categories && s.categories.toLowerCase().includes(search.toLowerCase())) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supplier Management ({suppliers.length} FMCG Vendors)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Details of 10 verified suppliers, lead times, reliability ratings, and catalogued lines
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus size={15} /> Add New Vendor
          </button>
          <button
            onClick={loadSuppliers}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers by name, code, category, or location..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-green-500 shadow-2xs"
        />
      </div>

      {/* 10 Suppliers Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-green-600" />
          Loading verified supplier directory...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 text-xs">
          No suppliers match your search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4 hover:border-gray-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header line */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-green-800 bg-green-50 px-2.5 py-0.5 rounded-md border border-green-200">
                        {s.code}
                      </span>
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {s.categories || 'FMCG Goods'}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mt-2">{s.name}</h3>
                    {s.contactName && (
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Contact Person: <strong className="text-gray-700">{s.contactName}</strong>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-black bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-200">
                      <Star size={12} className="fill-amber-400 text-amber-500" /> {s.rating} / 5.0
                    </span>
                    <span className="block text-[10px] text-gray-400 font-bold mt-1 flex items-center justify-end gap-1">
                      <Clock size={10} /> {s.leadTimeDays} days lead time
                    </span>
                  </div>
                </div>

                {/* Contact information */}
                <div className="bg-gray-50/70 p-3 rounded-xl text-xs space-y-1.5 text-gray-600 border border-gray-100">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span className="font-mono font-medium">{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                </div>

                {/* Products supplied preview */}
                {s.products && s.products.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Supplied Lines ({s.products.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.products.map((prod) => (
                        <span
                          key={prod.id}
                          className="text-[11px] font-medium bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md shadow-2xs"
                        >
                          {prod.name} (
                          <strong className="text-green-700">
                            {prod.inventory?.availableQuantity ?? 0} units
                          </strong>
                          )
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  {s._count?.purchases ?? 0} POs Completed
                </span>
                <Link
                  href="/admin/forecasting"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <ShoppingCart size={13} /> Order From Supplier
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Building2 size={18} className="text-green-600" />
                Register New Wholesale Supplier
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. S011"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Haldiram Snacks Wholesale"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="e.g. Ramesh Verma"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="orders@vendor.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address / Hub</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Industrial Estate, City, State"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categories</label>
                  <input
                    type="text"
                    value={form.categories}
                    onChange={(e) => setForm({ ...form, categories: e.target.value })}
                    placeholder="Snacks, Dairy"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
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
                  disabled={saving}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
