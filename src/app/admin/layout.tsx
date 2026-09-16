'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  CheckCircle2,
  PackagePlus,
  Building2,
  Truck,
  Zap,
  Bot,
  ExternalLink,
  LogOut,
  UploadCloud,
} from 'lucide-react'

const ADMIN_EMAIL = 'aluruhaneef1@gmail.com'

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Realtime Dashboard',
    icon: LayoutDashboard,
    badge: 'Live',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    href: '/admin/orders',
    label: 'Confirm Orders',
    icon: CheckCircle2,
  },
  {
    href: '/admin/sales-upload',
    label: 'Sales Upload',
    icon: UploadCloud,
    badge: 'RAG Train',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
  {
    href: '/admin/inventory',
    label: 'Inventory Entry',
    icon: PackagePlus,
  },
  {
    href: '/admin/suppliers',
    label: '10 Suppliers Directory',
    icon: Building2,
    badge: '10 Vendors',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    href: '/admin/purchases',
    label: 'Supplier Delivery Status',
    icon: Truck,
  },
  {
    href: '/admin/forecasting',
    label: 'Autonomous Ordering',
    icon: Zap,
    badge: 'AI Engine',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  {
    href: '/admin/ai',
    label: 'AI Assistant',
    icon: Bot,
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50/80">
      {/* Clean, Human-Designed Operational Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen sticky top-0 shadow-xs">
        {/* Brand Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm">
              SR
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">SmartRetail</p>
              <p className="text-[11px] text-green-600 font-semibold tracking-wide flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Autonomous Admin
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Store: Mydukur, Kadapa, AP (516172)</p>
        </div>

        {/* Clean Nav Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Operational Control Center
          </p>

          {NAV_ITEMS.map(({ href, label, icon: Icon, badge, badgeColor }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-sm shadow-green-600/20'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={17} className={isActive ? 'text-white' : 'text-gray-500'} />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : badgeColor
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Storefront & Signout Area */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/70 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold transition-colors shadow-2xs"
          >
            <ExternalLink size={13} /> View Customer Store
          </Link>

          <div className="pt-1">
            <p className="text-[11px] text-gray-500 truncate font-medium px-1 mb-1.5">{user.email}</p>
            <button
              onClick={() => {
                logout()
                router.push('/')
              }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Administrative Workspace */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  )
}
