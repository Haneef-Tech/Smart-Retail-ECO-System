import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { recommendationId, productId, quantity } = body

    const targetId = productId || recommendationId
    if (!targetId) {
      return NextResponse.json({ error: 'Target ID required' }, { status: 400 })
    }

    // Check if targetId is a Product ID directly
    let product = await db.product.findUnique({
      where: { id: targetId },
      include: { supplier: true, inventory: true },
    })

    let qty = quantity ? parseInt(quantity) : 20
    let reason = 'AI Reorder Recommendation'

    // If not found as Product, check if it is an AiRecommendation record
    if (!product) {
      const rec = await db.aiRecommendation.findUnique({
        where: { id: targetId },
        include: { product: { include: { supplier: true, inventory: true } } },
      })
      if (rec) {
        product = rec.product
        qty = rec.suggestedQty
        reason = rec.reason
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Product or Recommendation not found' }, { status: 404 })
    }

    const supplierId = product.supplierId || (await db.supplier.findFirst())?.id
    if (!supplierId) {
      return NextResponse.json({ error: 'No supplier mapped for product' }, { status: 400 })
    }

    const purchasePrice = Math.round(product.sellingPrice * 0.75)
    const invoiceNumber = `PO-AI-${Date.now().toString().slice(-6)}`

    const purchase = await db.purchase.create({
      data: {
        invoiceNumber,
        supplierId,
        status: 'PENDING',
        totalAmount: qty * purchasePrice,
        notes: `AI Recommended Purchase Order — ${reason}`,
        purchaseItems: {
          create: [
            {
              productId: product.id,
              quantity: qty,
              purchasePrice,
              subtotal: qty * purchasePrice,
            },
          ],
        },
      },
      include: {
        supplier: true,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'EXECUTE_AI_PO',
        entity: 'PURCHASE',
        entityId: purchase.id,
        details: `Approved AI recommendation and created PO ${invoiceNumber} for ${qty} units of ${product.name}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Created Purchase Order ${invoiceNumber} for ${qty} units of ${product.name} from ${purchase.supplier?.name}! Check Supplier Delivery Status.`,
      purchase,
    })
  } catch (error) {
    console.error('[API/admin/ai/execute POST]', error)
    return NextResponse.json({ error: 'Failed to execute recommendation' }, { status: 500 })
  }
}
