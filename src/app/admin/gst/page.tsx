'use client'

import { useEffect, useState } from 'react'
import { Percent, Save } from 'lucide-react'
import type { GstRate } from '@/types'

export default function AdminGstPage() {
  const [rates, setRates] = useState<GstRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/gst').then((r) => r.json()).then((d) => {
      setRates(d.rates || [])
      const init: Record<string, number> = {}
      for (const r of d.rates || []) init[r.category] = r.rate * 100
      setEditing(init)
      setLoading(false)
    })
  }, [])

  const handleSave = async (category: string) => {
    setSaving(category)
    const rate = (editing[category] || 0) / 100
    await fetch('/api/gst', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, rate }),
    })
    setRates((prev) => prev.map((r) => r.category === category ? { ...r, rate } : r))
    setSaving(null)
    setSuccess(category)
    setTimeout(() => setSuccess(null), 2000)
  }

  if (loading) return <div className="p-6"><div className="bg-white rounded-2xl h-64 animate-pulse" /></div>

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <Percent size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">GST Rate Editor</h1>
          <p className="text-sm text-gray-500">Changes take effect on all new orders immediately.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">GST Rate (%)</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rates.map((r) => (
              <tr key={r.category} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-800">{r.category}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editing[r.category] ?? r.rate * 100}
                      onChange={(e) => setEditing((p) => ({ ...p, [r.category]: parseFloat(e.target.value) || 0 }))}
                      className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {success === r.category ? (
                    <span className="text-green-600 text-xs font-semibold">✓ Saved!</span>
                  ) : (
                    <button
                      onClick={() => handleSave(r.category)}
                      disabled={saving === r.category}
                      className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Save size={12} /> {saving === r.category ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

