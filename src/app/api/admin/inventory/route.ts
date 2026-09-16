import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, code: true, leadTimeDays: true, rating: true } },
        inventory: true,
      },
      orderBy: { name: 'asc' },
    })

    const items = products.map((p) => {
      const stock = p.inventory?.availableQuantity ?? 0
      let stockStatus: 'healthy' | 'low' | 'out' = 'healthy'
      if (stock === 0) stockStatus = 'out'
      else if (stock <= p.reorderLevel) stockStatus = 'low'

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        categoryId: p.categoryId,
        supplier: p.supplier?.name || 'Unassigned',
        supplierId: p.supplierId,
        leadTimeDays: p.leadTimeDays,
        unit: p.unit,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        availableQuantity: stock,
        reservedQuantity: p.inventory?.reservedQuantity ?? 0,
        damagedQuantity: p.inventory?.damagedQuantity ?? 0,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        stockStatus,
      }
    })

    const categories = await db.category.findMany({ orderBy: { name: 'asc' } })
    const suppliers = await db.supplier.findMany({ orderBy: { name: 'asc' } })

    return NextResponse.json({ products: items, categories, suppliers })
  } catch (error) {
    console.error('[API/admin/inventory GET]', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      sku,
      categoryId,
      supplierId,
      mrp,
      sellingPrice,
      unit,
      initialStock,
      reorderLevel,
      safetyStock,
      description,
    } = body

    if (!name || !categoryId || mrp === undefined || sellingPrice === undefined) {
      return NextResponse.json({ error: 'Name, category, MRP, and selling price are required' }, { status: 400 })
    }

    const finalSku = sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`
    const id = `P${Date.now().toString().slice(-4)}`
    const stockUnits = parseInt(initialStock) || 0
    const rLevel = parseInt(reorderLevel) || 10
    const sStock = parseInt(safetyStock) || 5

    const newProduct = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          id,
          sku: finalSku,
          name: name.trim(),
          description: description?.trim() || '',
          categoryId,
          supplierId: supplierId || null,
          mrp: parseFloat(mrp),
          sellingPrice: parseFloat(sellingPrice),
          unit: unit || '1 pc',
          imageUrl: '/products/P001.svg', // default placeholder
          reorderLevel: rLevel,
          safetyStock: sStock,
          leadTimeDays: 2,
        },
      })

      await tx.inventory.create({
        data: {
          productId: product.id,
          availableQuantity: stockUnits,
          reservedQuantity: 0,
          damagedQuantity: 0,
        },
      })

      if (stockUnits > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            transactionType: 'PURCHASE',
            quantity: stockUnits,
            previousQuantity: 0,
            newQuantity: stockUnits,
            referenceType: 'INITIAL_ENTRY',
            referenceId: product.id,
            createdBy: 'ADMIN_OPERATOR',
          },
        })
      }

      return product
    })

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error) {
    console.error('[API/admin/inventory POST]', error)
    return NextResponse.json({ error: 'Failed to add product: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, changeQty, setQty, reason } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const currentQty = product.inventory?.availableQuantity ?? 0
    let newQty = currentQty

    if (setQty !== undefined) {
      newQty = Math.max(0, parseInt(setQty))
    } else if (changeQty !== undefined) {
      newQty = Math.max(0, currentQty + parseInt(changeQty))
    } else {
      return NextResponse.json({ error: 'Must provide either changeQty or setQty' }, { status: 400 })
    }

    const diff = newQty - currentQty

    await db.$transaction(async (tx) => {
      await tx.inventory.upsert({
        where: { productId },
        update: { availableQuantity: newQty },
        create: { productId, availableQuantity: newQty, reservedQuantity: 0, damagedQuantity: 0 },
      })

      await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: diff >= 0 ? 'ADJUSTMENT' : 'DAMAGE',
          quantity: diff,
          previousQuantity: currentQty,
          newQuantity: newQty,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: productId,
          createdBy: 'ADMIN_OPERATOR',
          createdAt: new Date(),
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'STOCK_UPDATE',
          entity: 'INVENTORY',
          entityId: productId,
          details: `Stock of ${product.name} adjusted from ${currentQty} to ${newQty} units (${reason || 'Manual Adjustment'})`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      previousQuantity: currentQty,
      newQuantity: newQty,
      message: `Updated stock of ${product.name} to ${newQty} units.`,
    })
  } catch (error) {
    console.error('[API/admin/inventory PATCH]', error)
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 })
  }
}

