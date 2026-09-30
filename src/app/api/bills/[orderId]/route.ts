import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuthFromRequest } from '@/lib/auth-util'
import { isPrivilegedRequest } from '@/lib/auth-guard'
import { validate } from '@/lib/api-response'
import { orderIdParamSchema } from '@/lib/validators/common'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId: rawId } = await params
    const idCheck = validate(orderIdParamSchema, { orderId: rawId })
    if (!idCheck.ok) return idCheck.response
    const { orderId } = idCheck.data
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

    // Admin access requires a verified ADMIN/STAFF session — never a uid/email string match.
    const isUserAdmin = await isPrivilegedRequest()

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
