import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuthFromRequest } from '@/lib/auth-util'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const { uid, email } = extractAuthFromRequest(req)

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                imageUrl: true,
              },
            },
          },
        },
        bill: true,
        customer: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check permissions if user identifier is provided
    const isUserAdmin =
      email === 'aluruhaneef1@gmail.com' ||
      uid === 'admin-uid' ||
      uid === 'admin-uid-haneef123'

    if (uid && !isUserAdmin) {
      let isOwner = order.customerId === uid
      if (!isOwner && email) {
        isOwner = order.customer?.email?.toLowerCase() === email.toLowerCase()
      }
      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('[API/bills/[orderId] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch bill' }, { status: 500 })
  }
}
