'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react'
import { useCartStore } from '@/store/cart'

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Shop', icon: ShoppingBag },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/profile', label: 'Account', icon: User },
]

export default function MobileNav() {
  const pathname = usePathname()
  const items = useCartStore((s) => s.items)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 relative transition-colors ${
                active ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                {href === '/cart' && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-green-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-green-600' : ''}`}>{label}</span>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

