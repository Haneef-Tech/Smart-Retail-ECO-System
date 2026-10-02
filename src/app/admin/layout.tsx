'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Building2,
  BarChart3,
  Bot,
  Zap,
  Database,
  Settings,
  LogOut,
  Menu,
  X,
    Store,
    Search,
    ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import OrderNotifications from '@/components/admin/OrderNotifications'

// Server-side authorization is enforced per page via requirePageRole;
// this client shell only mirrors the role for instant UI gating.

/* Sidebar labels per design spec; every href reuses an existing admin route
   so no navigation or data flow changes. */
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/sales', label: 'Sales', icon: TrendingUp },
  { href: '/admin/purchases', label: 'Purchases', icon: Truck },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/admin/reports', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/ai', label: 'AI Quick Checkup', icon: Bot },
  { href: '/admin/forecasting', label: 'Forecasting', icon: Zap },
  { href: '/admin/sales-upload', label: 'Data Management', icon: Database },
  { href: '/admin/gst', label: 'Settings', icon: Settings },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-200',
              isActive ? 'sr-nav-active font-semibold' : 'text-[#111827] font-medium hover:bg-[#F4FAF6] hover:text-[#0F5132]'
            )}
          >
            <Icon size={17} className={cn('shrink-0', isActive ? 'text-white' : 'text-[#6B7280]')} />
            <span className="truncate">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, sessionEmail, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Password-login (server session) admins have a role but no Firebase user —
  // gate on isAdmin so both login paths can enter.
  const displayEmail = user?.email ?? sessionEmail ?? ''

  // Auto-close mobile drawer when user navigates to a new page
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/auth/login?redirect=/admin')
    }
  }, [isAdmin, loading, router])

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-800">Verifying Admin Access...</p>
        <p className="text-xs text-gray-500 mt-1">Please wait or sign in to continue</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Slide-Over Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Semi-transparent Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Sliding Drawer Container */}
          <div className="relative z-50 w-72 max-w-[85vw] bg-white flex flex-col h-full shadow-2xl sr-toast-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm [background:linear-gradient(135deg,#16A34A,#22C55E)]">
                  SR
                </div>
                <div>
                  <p className="font-bold text-[#111827] text-sm leading-tight">SmartRetail</p>
                  <p className="text-[10px] text-[#6B7280]">Mydukur, Kadapa (516172)</p>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-[#F4FAF6] transition-colors duration-200"
              >
                <X size={18} />
              </button>
            </div>

            <NavLinks pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />

            {/* Mobile Drawer Bottom Area */}
            <div className="p-3 border-t border-[#E5E7EB] bg-[#F4FAF6]/60 space-y-2">
              <Link
                href="/"
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs bg-white border border-[#E5E7EB] text-[#111827] hover:bg-[#F4FAF6] font-semibold transition-all duration-200"
              >
                <ExternalLink size={13} /> View Customer Store
              </Link>

              <div className="pt-1">
                <p className="text-[11px] text-[#6B7280] truncate font-medium px-1 mb-1.5">{displayEmail}</p>
                <button
                  onClick={() => {
                    logout()
                    router.push('/')
                  }}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200 font-semibold"
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Visible on screens >= md) */}
      <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:shrink-0 md:h-screen md:sticky md:top-0 bg-white border-r border-[#E5E7EB]">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E5E7EB]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-[0_4px_14px_rgba(22,163,74,0.3)] [background:linear-gradient(135deg,#16A34A,#22C55E)]">
              SR
            </div>
            <div>
              <p className="font-bold text-[#0F5132] text-base leading-tight tracking-tight">SmartRetail</p>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        <NavLinks pathname={pathname} />

        {/* Bottom Storefront & Signout Area */}
        <div className="p-3 border-t border-[#E5E7EB] bg-[#F4FAF6]/50 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs bg-white border border-[#E5E7EB] text-[#111827] hover:border-green-200 hover:text-[#0F5132] font-semibold transition-all duration-200"
          >
            <ExternalLink size={13} /> View Customer Store
          </Link>

          <div className="pt-1">
            <p className="text-[11px] text-[#6B7280] truncate font-medium px-1 mb-1.5">{displayEmail}</p>
            <button
              onClick={() => {
                logout()
                router.push('/')
              }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200 font-semibold"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 w-full flex flex-col">
        {/* Top bar: hamburger (mobile) + search + bell + admin profile */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E5E7EB]/70 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 lg:px-8 h-16">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 -ml-1 text-[#111827] hover:text-[#0F5132] hover:bg-[#F4FAF6] rounded-xl transition-all duration-200"
            >
              <Menu size={21} />
            </button>

            <Link href="/admin" className="flex md:hidden items-center gap-2 mr-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs [background:linear-gradient(135deg,#16A34A,#22C55E)]">
                SR
              </div>
            </Link>

            {/* Search */}
            <div className="hidden sm:flex flex-1 max-w-md items-center bg-[#F4FAF6] border border-[#E5E7EB] rounded-xl overflow-hidden transition-all duration-200 focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-green-100 focus-within:bg-white">
              <Search size={16} className="ml-3.5 text-[#6B7280] shrink-0" />
              <input
                placeholder="Search anything..."
                className="flex-1 px-2.5 py-2 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#6B7280]"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <Link
                href="/"
                target="_blank"
                className="md:hidden inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F5132] bg-[#F4FAF6] hover:bg-green-100 px-2.5 py-1.5 rounded-xl border border-green-100 transition-all duration-200"
              >
                <Store size={13} />
                <span>Store</span>
              </Link>

              {/* Real-time order notifications (SSE + 15s polling fallback) */}
              <OrderNotifications />

              {/* Admin avatar + name */}
              <div className="flex items-center gap-2.5 pl-1 sm:pl-2 sm:border-l sm:border-[#E5E7EB]">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold [background:linear-gradient(135deg,#16A34A,#22C55E)] shadow-[0_4px_14px_rgba(22,163,74,0.3)]">
                  A
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-[13px] font-semibold text-[#111827]">Admin</p>
                  <p className="text-[11px] text-[#6B7280]">Store Manager</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-5 lg:p-7 sr-page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}
