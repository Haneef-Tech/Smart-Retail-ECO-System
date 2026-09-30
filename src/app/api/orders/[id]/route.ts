import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuthFromRequest } from '@/lib/auth-util'
import { guardRoles, isPrivilegedRequest } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { orderIdParamSchema } from '@/lib/validators/common'
import { orderStatusSchema } from '@/lib/validators/orders'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid, email } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: rawId } = await params
    const idCheck = validate(orderIdParamSchema, { orderId: rawId })
    if (!idCheck.ok) return idCheck.response
    const { orderId: id } = idCheck.data
    const order = await db.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        bill: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Admin access requires a verified ADMIN/STAFF session — never a uid/email string match.
    const isUserAdmin = await isPrivilegedRequest()

    if (!isUserAdmin) {
      const isOwner =
        order.customerId === uid ||
        (email && order.customer?.email?.toLowerCase() === email.toLowerCase())

      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('[API/orders/[id] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Order status changes are a privileged admin operation.
  const { denied, requester } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  if (!requester) return NextResponse.json({ error: 'Unauthorized: sign-in required' }, { status: 401 })
  try {
    const { id: rawId } = await params
    const idCheck = validate(orderIdParamSchema, { orderId: rawId })
    if (!idCheck.ok) return idCheck.response
    const { orderId: id } = idCheck.data

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const statusCheck = validate(orderStatusSchema, raw.body)
    if (!statusCheck.ok) return statusCheck.response
    const { status } = statusCheck.data

    const order = await db.order.findUnique({
      where: { id },
      include: { orderItems: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updatedOrder = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status },
      })

      // If confirming/delivering order, convert reserved stock to sale transaction
      if (status === 'CONFIRMED' || status === 'DELIVERED') {
        for (const item of order.orderItems) {
          const inv = await tx.inventory.findUnique({ where: { productId: item.productId } })
          if (inv) {
            const newRes = Math.max(0, inv.reservedQuantity - item.quantity)
            await tx.inventory.update({
              where: { productId: item.productId },
              data: { reservedQuantity: newRes },
            })
          }

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              transactionType: 'SALE',
              quantity: -item.quantity,
              previousQuantity: inv?.availableQuantity ?? 0,
              newQuantity: inv?.availableQuantity ?? 0,
              referenceType: 'ORDER',
              referenceId: order.id,
            },
          })
        }
      }

      try {
        await tx.auditLog.create({
          data: {
            userId: requester.uid,
            userEmail: requester.email,
            action: 'UPDATE_STATUS',
            entity: 'ORDER',
            entityId: order.id,
            details: `Order #${order.id.slice(0, 8)} status updated to ${status} by ${requester.email}`,
          },
        })
      } catch (auditErr) {
        console.warn('[API/orders/[id] PATCH] Non-critical audit log skipped:', auditErr)
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      message: `Order #${id.slice(0, 8)} status updated to ${status} in database.`,
      order: updatedOrder,
    })
  } catch (error) {
    console.error('[API/orders/[id] PATCH]', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}
