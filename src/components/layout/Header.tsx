'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, User, Package, Search, Menu, X, LogOut, Settings } from 'lucide-react'
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
  const [catMenuOpen, setCatMenuOpen] = useState(false)
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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SR</span>
            </div>
            <span className="font-bold text-green-700 text-xl hidden sm:block">SmartRetail</span>
          </Link>

          {/* Search - desktop */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="flex w-full border border-gray-200 rounded-full overflow-hidden focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 transition-all">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="flex-1 px-4 py-2 text-sm outline-none bg-gray-50"
              />
              <button type="submit" className="px-4 bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 transition-colors">
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <User size={20} className="text-gray-600" />
                <span className="text-sm text-gray-700 hidden sm:block max-w-[100px] truncate">
                  {user ? user.email?.split('@')[0] : 'Login'}
                </span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
                        <User size={15} /> My Profile
                      </Link>
                      <Link href="/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
                        <Package size={15} /> My Orders
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-green-50 text-green-700 border-t border-gray-100">
                          <Settings size={15} /> Admin Panel
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 border-t border-gray-100">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">Sign In</Link>
                      <Link href="/auth/register" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">Create Account</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <Link href="/cart" className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
              <ShoppingCart size={20} className="text-gray-600" />
              <span className="text-sm text-gray-700 hidden sm:block">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen((o) => !o)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Category nav - desktop */}
        <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/categories/${encodeURIComponent(cat)}`}
              className="px-3 py-1 text-sm text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-full whitespace-nowrap transition-colors"
            >
              {cat}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile expanded menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex mt-3 mb-3">
            <div className="flex w-full border border-gray-200 rounded-full overflow-hidden focus-within:border-green-500">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="flex-1 px-4 py-2 text-sm outline-none bg-gray-50"
              />
              <button type="submit" className="px-4 bg-green-600 text-white">
                <Search size={16} />
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
                className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-full"
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

