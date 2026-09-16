import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, supplierId, quantity, purchasePrice, invoiceNumber, notes } = body

    if (!productId || !supplierId || !quantity || purchasePrice === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const qty = parseInt(quantity)
    const price = parseFloat(purchasePrice)
    const invNo = invoiceNumber || `PO-MANUAL-${Date.now()}`

    const result = await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber: invNo,
          supplierId,
          status: 'COMPLETED',
          totalAmount: qty * price,
          notes,
          purchaseItems: {
            create: [
              {
                productId,
                quantity: qty,
                purchasePrice: price,
                subtotal: qty * price,
              },
            ],
          },
        },
      })

      const inv = await tx.inventory.findUnique({ where: { productId } })
      const prevQty = inv?.availableQuantity ?? 0
      const newQty = prevQty + qty

      await tx.inventory.upsert({
        where: { productId },
        update: { availableQuantity: newQty },
        create: { productId, availableQuantity: newQty, reservedQuantity: 0, damagedQuantity: 0 },
      })

      await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'PURCHASE',
          quantity: qty,
          previousQuantity: prevQty,
          newQuantity: newQty,
          referenceType: 'MANUAL_PURCHASE',
          referenceId: purchase.id,
          createdBy: 'ADMIN',
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'INVENTORY',
          entityId: purchase.id,
          details: `Added ${qty} units of product ${productId} (Invoice: ${invNo})`,
        },
      })

      return purchase
    })

    return NextResponse.json({ purchase: result }, { status: 201 })
  } catch (error) {
    console.error('[API/admin/incoming-stock POST]', error)
    return NextResponse.json({ error: 'Failed to add incoming stock' }, { status: 500 })
  }
}

