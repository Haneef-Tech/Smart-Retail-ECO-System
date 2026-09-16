import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await getUidFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        bill: true,
        customer: { select: { name: true, email: true, phone: true } },
      },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json({ order })
  } catch (error) {
    console.error('[API/orders/[id] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required' }, { status: 400 })
    }

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

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_STATUS',
          entity: 'ORDER',
          entityId: order.id,
          details: `Admin updated order #${order.id.slice(0, 8)} status to ${status}`,
        },
      })

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
