'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, User, Package, Search, Menu, X, LogOut, Settings, MapPin } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@/store/cart'
import { useAuth } from '@/context/AuthContext'

const CATEGORIES = ['Grocery', 'Dairy', 'Bakery', 'Beverages', 'Snacks', 'Personal Care', 'Home', 'Stationery', 'Accessories']

export default function Header() {
  const router = useRouter()
  const { user, isAdmin, logout } = useAuth()
  const items = useCartStore((s) => s.items)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/products?search=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <header className="bg-white/95 backdrop-blur sticky top-0 z-50 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border-b border-[#E5E7EB]/70">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-5 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 sr-interactive rounded-xl">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_4px_14px_rgba(22,163,74,0.3)] [background:linear-gradient(135deg,#16A34A,#22C55E)]">
              <span className="text-white font-bold text-sm">SR</span>
            </div>
            <span className="font-bold text-[#0F5132] text-xl hidden sm:block tracking-tight">SmartRetail</span>
          </Link>

          {/* Search - desktop */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
            <div className="flex w-full items-center bg-[#F4FAF6] border border-[#E5E7EB] rounded-xl overflow-hidden transition-all duration-200 focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-green-100 focus-within:bg-white">
              <Search size={17} className="ml-4 text-[#6B7280] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for products..."
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#6B7280]"
              />
              <button type="submit" className="sr-btn-primary m-1 px-5 py-1.5 text-sm font-semibold">
                Search
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            {/* Location */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#6B7280]">
              <MapPin size={17} className="text-[#16A34A]" />
              <span className="text-xs font-medium text-[#111827] leading-tight">Mydukur<br /><span className="text-[#6B7280]">516172</span></span>
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-label="Account"
                className="flex items-center gap-1.5 p-2.5 rounded-xl hover:bg-[#F4FAF6] text-[#6B7280] hover:text-[#0F5132] transition-all duration-200"
              >
                <User size={20} />
              </button>
              {userMenuOpen && (
                <div className="sr-toast-in absolute right-0 top-full mt-2 w-52 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.10)] z-50 py-1.5 overflow-hidden">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-[#6B7280]">Signed in as</p>
                        <p className="text-sm font-medium text-[#111827] truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#F4FAF6] text-[#111827] transition-colors duration-200">
                        <User size={15} /> My Profile
                      </Link>
                      <Link href="/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#F4FAF6] text-[#111827] transition-colors duration-200">
                        <Package size={15} /> My Orders
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-green-50 text-green-700 border-t border-gray-100 transition-colors duration-200">
                          <Settings size={15} /> Admin Panel
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 border-t border-gray-100 transition-colors duration-200">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[#F4FAF6] text-[#111827] transition-colors duration-200">Sign In</Link>
                      <Link href="/auth/register" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[#F4FAF6] text-[#111827] transition-colors duration-200">Create Account</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <Link href="/cart" className="relative p-2.5 rounded-xl hover:bg-[#F4FAF6] text-[#6B7280] hover:text-[#0F5132] transition-all duration-200">
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="md:hidden p-2.5 rounded-xl hover:bg-[#F4FAF6] text-[#111827] transition-colors duration-200">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile expanded menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-4 pb-4 sr-page-enter">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex mt-3 mb-3">
            <div className="flex w-full items-center bg-[#F4FAF6] border border-[#E5E7EB] rounded-xl overflow-hidden focus-within:border-[#16A34A]">
              <Search size={16} className="ml-3.5 text-[#6B7280] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for products..."
                className="flex-1 px-2.5 py-2.5 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#6B7280]"
              />
              <button type="submit" className="sr-btn-primary m-1 px-4 py-1.5 text-sm font-semibold">
                Go
              </button>
            </div>
          </form>
          {/* Mobile category list */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/categories/${encodeURIComponent(cat)}`}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-1.5 text-xs font-medium bg-[#F4FAF6] text-[#0F5132] rounded-full border border-green-100"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
