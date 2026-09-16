import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const purchases = await db.purchase.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            contactName: true,
            phone: true,
            email: true,
            leadTimeDays: true,
            rating: true,
          },
        },
        purchaseItems: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ purchases })
  } catch (error) {
    console.error('[API/admin/purchases GET]', error)
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { supplierId, productId, quantity, purchasePrice, notes } = body

    if (!supplierId || !productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'supplierId, productId, and positive quantity are required' },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const price = purchasePrice ?? Math.round(product.sellingPrice * 0.75)
    const totalAmount = price * quantity
    const invoiceNumber = `PO-${Date.now().toString().slice(-6)}`

    // Calculate expected delivery date based on product/supplier lead time
    const leadDays = product.leadTimeDays || 2
    const expectedDelivery = new Date()
    expectedDelivery.setDate(expectedDelivery.getDate() + leadDays)

    const purchase = await db.purchase.create({
      data: {
        invoiceNumber,
        supplierId,
        status: 'PENDING',
        totalAmount,
        expectedDelivery,
        notes: notes || `Autonomous purchase order for ${quantity} units of ${product.name}`,
        purchaseItems: {
          create: [
            {
              productId,
              quantity,
              purchasePrice: price,
              subtotal: totalAmount,
            },
          ],
        },
      },
      include: {
        supplier: true,
        purchaseItems: { include: { product: true } },
      },
    })

    return NextResponse.json({ success: true, purchase })
  } catch (error) {
    console.error('[API/admin/purchases POST]', error)
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { purchaseId, status } = body

    if (!purchaseId || !status) {
      return NextResponse.json({ error: 'purchaseId and status are required' }, { status: 400 })
    }

    const existing = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { purchaseItems: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // If moving to DELIVERED and wasn't delivered yet, restock products in database
    if (status === 'DELIVERED' && existing.status !== 'DELIVERED') {
      await db.$transaction(async (tx) => {
        for (const item of existing.purchaseItems) {
          const inv = await tx.inventory.findUnique({ where: { productId: item.productId } })
          const prevQty = inv?.availableQuantity ?? 0
          const newQty = prevQty + item.quantity

          await tx.inventory.upsert({
            where: { productId: item.productId },
            update: { availableQuantity: newQty },
            create: { productId: item.productId, availableQuantity: newQty, reservedQuantity: 0, damagedQuantity: 0 },
          })

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              transactionType: 'PURCHASE',
              quantity: item.quantity,
              previousQuantity: prevQty,
              newQuantity: newQty,
              referenceType: 'PURCHASE_DELIVERY',
              referenceId: existing.id,
              createdBy: 'ADMIN_OPERATOR',
            },
          })
        }

        await tx.purchase.update({
          where: { id: purchaseId },
          data: { status: 'DELIVERED' },
        })
      })

      return NextResponse.json({
        success: true,
        message: `PO ${existing.invoiceNumber} marked as Delivered! Stock successfully added to inventory.`,
      })
    }

    // Otherwise just update status (e.g. IN_TRANSIT, CANCELLED)
    const updated = await db.purchase.update({
      where: { id: purchaseId },
      data: { status },
    })

    return NextResponse.json({ success: true, purchase: updated })
  } catch (error) {
    console.error('[API/admin/purchases PATCH]', error)
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
  }
}

