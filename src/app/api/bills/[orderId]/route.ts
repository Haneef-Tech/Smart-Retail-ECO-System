import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const uid = await getUidFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orderId } = await params
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        bill: true,
        customer: true,
      },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.customerId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ order })
  } catch (error) {
    console.error('[API/bills/[orderId] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch bill' }, { status: 500 })
  }
}
