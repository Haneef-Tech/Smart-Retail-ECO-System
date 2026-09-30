'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  ShoppingBasket,
  Milk,
  Cookie,
  Sparkles,
  Home,
  Pencil,
  Baby,
  Apple,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* Display labels per design spec; hrefs reuse the store's real category routes
   so filtering / data flow is unchanged. */
const ITEMS = [
  { label: 'All Categories', icon: LayoutGrid, href: '/products', match: ['/', '/products'] },
  { label: 'Groceries', icon: ShoppingBasket, href: '/categories/Grocery' },
  { label: 'Dairy & Beverages', icon: Milk, href: '/categories/Dairy' },
  { label: 'Snacks & Foods', icon: Cookie, href: '/categories/Snacks' },
  { label: 'Personal Care', icon: Sparkles, href: `/categories/${encodeURIComponent('Personal Care')}` },
  { label: 'Household', icon: Home, href: '/categories/Home' },
  { label: 'Stationery', icon: Pencil, href: '/categories/Stationery' },
  { label: 'Baby Care', icon: Baby, href: '/categories/Accessories' },
  { label: 'Fruits & Vegetables', icon: Apple, href: '/categories/Grocery' },
]

export default function CategorySidebar() {
  const pathname = usePathname()

  return (
    <aside className="sr-card p-3 sr-page-enter">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
        {ITEMS.map(({ label, icon: Icon, href, match }) => {
          const isActive = match ? match.includes(pathname) : pathname === href
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'sr-nav-active font-semibold'
                  : 'text-[#111827] hover:bg-[#F4FAF6] hover:text-[#0F5132]'
              )}
            >
              <Icon size={17} className={cn('shrink-0', isActive ? 'text-white' : 'text-[#16A34A]')} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={15} className={cn('shrink-0 hidden lg:block', isActive ? 'text-white/80' : 'text-[#6B7280]/50')} />
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
