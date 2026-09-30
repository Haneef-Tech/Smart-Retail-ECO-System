import { guardRoles } from '@/lib/auth-guard'
import { subscribeOrderEvents, type OrderCreatedEvent } from '@/lib/order-events'

// SSE must run on Node (streams a long-lived response, not edge-compatible here).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/events — Server-Sent Events for admin notifications.
 * Protected: ADMIN / STAFF only (verified session, never a query param).
 *
 * VERCEL LIMITATION: serverless functions cap connection lifetime
 * (hobby ≈ 60s+ timeouts, fluids vary), so an SSE stream WILL be cut.
 * EventSource reconnects automatically, and the admin UI additionally polls
 * `/api/orders` every 15s — between reconnect + polling, no order
 * notification is missed. See OrderNotifications for the client side.
 */
export async function GET() {
  const { denied } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client went away; cancel() below cleans up.
        }
      }

      // Initial hello so the client knows the stream is live.
      send('connected', { at: new Date().toISOString() })

      const unsubscribe = subscribeOrderEvents((order: OrderCreatedEvent) => {
        send('order', order)
      })

      // Comment ping keeps intermediaries from closing an idle stream.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          // Ignored — cleanup happens in cancel().
        }
      }, 25000)

      // Stash cleanup on the controller for cancel().
      ;(controller as unknown as { __cleanup?: () => void }).__cleanup = () => {
        clearInterval(heartbeat)
        unsubscribe()
      }
    },
    cancel(controller) {
      ;(controller as unknown as { __cleanup?: () => void }).__cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
