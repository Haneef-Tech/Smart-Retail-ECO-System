'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'

/* ---------- Card: white rounded-2xl, 1px border, soft shadow, hover lift ---------- */
export function Card({
  className,
  hover = false,
  style,
  children,
}: {
  className?: string
  hover?: boolean
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div className={cn('sr-card', hover && 'sr-card-hover', className)} style={style}>
      {children}
    </div>
  )
}

/* ---------- IconTile: small colored rounded-square tile with light tint ---------- */
const TILE_TINTS: Record<string, string> = {
  green: 'bg-green-100 text-[#16A34A]',
  blue: 'bg-blue-100 text-[#3B82F6]',
  purple: 'bg-purple-100 text-[#8B5CF6]',
  orange: 'bg-orange-100 text-[#F59E0B]',
  red: 'bg-red-100 text-[#EF4444]',
  pink: 'bg-pink-100 text-[#EC4899]',
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
}

export function IconTile({
  color = 'green',
  className,
  children,
}: {
  color?: keyof typeof TILE_TINTS | string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('sr-icon-tile', TILE_TINTS[color] ?? TILE_TINTS.green, className)}>{children}</div>
  )
}

/* ---------- CountUp: KPI numbers count up from 0 on load ---------- */
export type CountUpFormat = 'price' | 'int'

export function CountUp({
  value,
  format,
  duration = 900,
  className,
}: {
  value: number
  // Serializable key (NOT a function): server components cannot pass
  // functions to client components. 'price' → ₹-formatted, 'int'/unset → integer.
  format?: CountUpFormat
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  const text =
    format === 'price' ? formatPrice(Math.round(display)) : Math.round(display).toLocaleString('en-IN')
  return <span className={className}>{text}</span>
}

/* ---------- Skeleton: shimmer placeholder instead of spinners ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('sr-skeleton', className)} aria-hidden="true" />
}

/* ---------- KpiCard: colored icon tile + muted label + bold value + trend ---------- */
export function KpiCard({
  label,
  value,
  icon,
  iconColor = 'green',
  trend,
  trendUp,
  index = 0,
  format,
}: {
  label: string
  value: number
  icon: React.ReactNode
  iconColor?: string
  trend?: string
  trendUp?: boolean
  index?: number
  format?: CountUpFormat
}) {
  return (
    <Card hover className="p-5 sr-stagger" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <IconTile color={iconColor}>{icon}</IconTile>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-bold px-2 py-0.5 rounded-full',
              trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-[#6B7280] mt-4">{label}</p>
      <p className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
        <CountUp value={value} format={format} />
      </p>
    </Card>
  )
}

/* ---------- SectionHeader: title left, green link right ---------- */
export function SectionHeader({
  title,
  subtitle,
  linkLabel,
  linkHref,
}: {
  title: string
  subtitle?: string
  linkLabel?: string
  linkHref?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F5132] tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-[#6B7280] mt-1">{subtitle}</p>}
      </div>
      {linkLabel && linkHref && (
        <a
          href={linkHref}
          className="text-sm font-semibold text-[#16A34A] hover:text-[#15803D] transition-colors duration-200 shrink-0"
        >
          {linkLabel} →
        </a>
      )}
    </div>
  )
}

/* ---------- Toast: slide in from top right (event-based, no library) ---------- */
type ToastItem = { id: number; message: string }

let toastSeq = 0

export function toast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sr-toast', { detail: message }))
  }
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string) => {
    const id = ++toastSeq
    setItems((prev) => [...prev.slice(-2), { id, message }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 2600)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => push((e as CustomEvent<string>).detail)
    window.addEventListener('sr-toast', handler)
    return () => window.removeEventListener('sr-toast', handler)
  }, [push])

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className="sr-toast-in pointer-events-auto flex items-center gap-2 bg-[#0F5132] text-white text-sm font-medium pl-3 pr-4 py-2.5 rounded-xl shadow-lg"
        >
          <CheckCircle2 size={17} className="text-green-300 shrink-0" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
