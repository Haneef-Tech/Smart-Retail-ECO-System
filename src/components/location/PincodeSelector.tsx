'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Search } from 'lucide-react'
import type { PincodeResult } from '@/types'

interface Props {
  value: PincodeResult | null
  onChange: (result: PincodeResult | null) => void
  error?: string
}

export default function PincodeSelector({ value, onChange, error }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PincodeResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Search pincodes
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/pincodes?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.pincodes || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  const select = (r: PincodeResult) => {
    onChange(r)
    setQuery(`${r.pincode} — ${r.area}, ${r.city}`)
    setOpen(false)
    setResults([])
  }

  const clear = () => {
    onChange(null)
    setQuery('')
    setResults([])
  }

  return (
    <div className="space-y-1" ref={ref}>
      <label className="block text-sm font-medium text-gray-700">
        Pincode <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 transition-all bg-white">
          <MapPin size={16} className="ml-3 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              if (!e.target.value) clear()
            }}
            onFocus={() => setOpen(true)}
            placeholder="Type pincode or area name…"
            className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
          />
          {query && (
            <button onClick={clear} className="px-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
          )}
          <ChevronDown size={14} className="mr-2 text-gray-400" />
        </div>

        {/* Dropdown */}
        {open && (results.length > 0 || loading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                Searching…
              </div>
            )}
            {!loading && results.map((r) => (
              <button
                key={r.pincode}
                onClick={() => select(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <span className="font-semibold text-green-700 text-sm">{r.pincode}</span>
                <span className="text-gray-600 text-sm"> — {r.area}</span>
                <span className="text-gray-400 text-xs block">{r.city}, {r.state}</span>
              </button>
            ))}
          </div>
        )}
        {open && query.length >= 2 && !loading && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-gray-400">
            No pincode found for "<span className="font-medium">{query}</span>"
          </div>
        )}
      </div>

      {/* Auto-filled fields */}
      {value && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="bg-green-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase">Area</p>
            <p className="text-sm font-medium text-gray-800 truncate">{value.area}</p>
          </div>
          <div className="bg-green-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase">City</p>
            <p className="text-sm font-medium text-gray-800 truncate">{value.city}</p>
          </div>
          <div className="bg-green-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase">State</p>
            <p className="text-sm font-medium text-gray-800 truncate">{value.state}</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}

