'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderNotice {
  orderId: string
  billNumber: string
  total: number
  itemCount: number
  createdAt: string
}

// Poll cadence for the fallback (also covers Vercel SSE timeouts and
// multi-instance gaps — see /api/admin/events route comment).
const POLL_INTERVAL_MS = 15000
const MAX_NOTICES = 8
const TOAST_TTL_MS = 6000

interface OrdersResponse {
  orders?: Array<{
    id: string
    total: number
    createdAt: string
    bill?: { billNumber: string } | null
    orderItems?: Array<unknown>
  }>
}

async function fetchRecentOrders(): Promise<OrderNotice[]> {
  const res = await fetch('/api/orders', { cache: 'no-store' })
  if (!res.ok) return []
  const data = (await res.json()) as OrdersResponse
  return (data.orders ?? []).slice(0, MAX_NOTICES).map((o) => ({
    orderId: o.id,
    billNumber: o.bill?.billNumber ?? `#${o.id.slice(0, 8)}`,
    total: o.total,
    itemCount: o.orderItems?.length ?? 0,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(o.createdAt).toISOString(),
  }))
}

export default function OrderNotifications() {
  const [notices, setNotices] = useState<OrderNotice[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [toasts, setToasts] = useState<OrderNotice[]>([])
  const knownIds = useRef<Set<string>>(new Set())
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Merge new orders: unseen ids go to the top, badge + toast update.
  const ingest = useCallback((incoming: OrderNotice[]) => {
    const fresh = incoming.filter((n) => !knownIds.current.has(n.orderId))
    if (fresh.length === 0) return
    for (const n of fresh) knownIds.current.add(n.orderId)
    setNotices((prev) => [...fresh, ...prev].slice(0, MAX_NOTICES))
    setUnread((u) => u + fresh.length)
    setToasts((prev) => [...fresh, ...prev].slice(0, 3))
    for (const n of fresh) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.orderId !== n.orderId))
      }, TOAST_TTL_MS)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Seed known ids so existing orders never toast on load.
    fetchRecentOrders()
      .then((recent) => {
        if (cancelled) return
        for (const n of recent) knownIds.current.add(n.orderId)
        setNotices(recent)
      })
      .catch(() => {
        // Non-admin or offline — the layout gate handles auth; stay quiet.
      })

    // Fast path: Server-Sent Events with explicit reconnect on drop.
    // (EventSource also retries natively; this covers hard failures.)
    const connect = () => {
      if (cancelled) return
      try {
        esRef.current?.close()
        const es = new EventSource('/api/admin/events')
        esRef.current = es
        es.addEventListener('order', (evt) => {
          try {
            const data = JSON.parse((evt as MessageEvent).data) as OrderNotice
            if (data?.orderId) ingest([data])
          } catch {
            // Malformed payload — polling fallback will pick it up.
          }
        })
        es.onerror = () => {
          es.close()
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
          // Reconnect with a short backoff; polling below covers the gap.
          reconnectTimer.current = setTimeout(connect, 5000)
        }
      } catch {
        // EventSource unsupported — polling fallback below is sufficient.
      }
    }
    connect()

    // Safety net: poll every 15s. Required on Vercel serverless where SSE
    // connections time out, and across instances (in-memory bus is per-instance).
    const poll = setInterval(() => {
      fetchRecentOrders().then(ingest).catch(() => {})
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(poll)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      esRef.current?.close()
    }
  }, [ingest])

  const toggle = () => {
    setOpen((o) => !o)
    setUnread(0)
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={toggle}
          aria-label="Order notifications"
          className="relative p-2.5 rounded-xl hover:bg-[#F4FAF6] text-[#6B7280] hover:text-[#0F5132] transition-all duration-200"
        >
          <Bell size={19} />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                <p className="text-sm font-bold text-[#111827]">Recent orders</p>
                <Link
                  href="/admin/orders"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-[#0F5132] hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notices.length === 0 && (
                  <p className="px-4 py-6 text-xs text-gray-400 text-center">No orders yet.</p>
                )}
                {notices.map((n) => (
                  <Link
                    key={n.orderId}
                    href="/admin/orders"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-[#F4FAF6] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900 truncate">{n.billNumber}</p>
                      <p className="text-xs font-bold text-green-700 shrink-0">
                        {formatPrice(n.total)}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {n.itemCount} item{n.itemCount === 1 ? '' : 's'} ·{' '}
                      {new Date(n.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toasts for newly arrived orders */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <Link
            key={t.orderId}
            href="/admin/orders"
            className="block bg-[#0F5132] text-white rounded-2xl px-4 py-3 shadow-lg hover:brightness-110 transition-all"
          >
            <p className="text-xs font-bold">New order · {t.billNumber}</p>
            <p className="text-[11px] text-green-100 mt-0.5">
              {t.itemCount} item{t.itemCount === 1 ? '' : 's'} · {formatPrice(t.total)}
            </p>
          </Link>
        ))}
      </div>
    </>
  )
}
