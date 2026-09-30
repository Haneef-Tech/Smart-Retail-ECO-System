/**
 * In-process pub/sub bus for admin order notifications.
 *
 * The SSE route (`/api/admin/events`) subscribes; the checkout route
 * (`POST /api/orders`) publishes after the order transaction commits.
 *
 * SCALING NOTE: listeners live in this server instance's memory only. On
 * multi-instance hosting (e.g. Vercel serverless) an order created on
 * instance A will NOT reach SSE subscribers connected to instance B.
 * The admin UI therefore ALSO polls `/api/orders` every 15s as a fallback,
 * so no notification is ever lost — SSE is the fast path, polling is the
 * safety net. A shared broker (Redis/Postgres LISTEN) would remove this
 * limitation if instances multiply.
 */

export interface OrderCreatedEvent {
  type: 'order.created'
  orderId: string
  billNumber: string
  total: number
  itemCount: number
  createdAt: string
}

type Listener = (event: OrderCreatedEvent) => void

const listeners = new Set<Listener>()

export function subscribeOrderEvents(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Fire-and-forget: listener errors are swallowed so publishing never breaks checkout. */
export function publishOrderEvent(event: OrderCreatedEvent): void {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // Ignore — a broken subscriber must not fail order creation.
    }
  }
}
