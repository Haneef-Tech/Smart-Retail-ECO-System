import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: { category: true, supplier: true, inventory: true },
    })

    const lowStock: unknown[] = []
    const criticalStock: unknown[] = []
    const outOfStock: unknown[] = []
    const overstock: unknown[] = []
    const deadStock: unknown[] = []
    const healthyStock: unknown[] = []

    let totalValuation = 0

    products.forEach((p) => {
      const avail = p.inventory?.availableQuantity ?? 0
      const res = p.inventory?.reservedQuantity ?? 0
      const dam = p.inventory?.damagedQuantity ?? 0
      const price = p.sellingPrice

      totalValuation += avail * price

      const itemInfo = {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        supplier: p.supplier?.name || 'Unassigned',
        availableQuantity: avail,
        reservedQuantity: res,
        damagedQuantity: dam,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        leadTimeDays: p.leadTimeDays,
        sellingPrice: p.sellingPrice,
        stockValue: avail * price,
      }

      if (avail === 0) {
        outOfStock.push(itemInfo)
      } else if (avail <= p.safetyStock) {
        criticalStock.push(itemInfo)
      } else if (avail <= p.reorderLevel) {
        lowStock.push(itemInfo)
      } else if (avail > p.reorderLevel * 3) {
        overstock.push(itemInfo)
      } else {
        healthyStock.push(itemInfo)
      }

      // Dead stock heuristic: > 100 stock & stationery/accessories
      if (avail > 100 && (p.category.name === 'Stationery' || p.category.name === 'Accessories')) {
        deadStock.push(itemInfo)
      }
    })

    return NextResponse.json({
      summary: {
        totalActiveProducts: products.length,
        totalValuation,
        healthyCount: healthyStock.length,
        lowStockCount: lowStock.length,
        criticalStockCount: criticalStock.length,
        outOfStockCount: outOfStock.length,
        overstockCount: overstock.length,
        deadStockCount: deadStock.length,
      },
      healthyStock,
      lowStock,
      criticalStock,
      outOfStock,
      overstock,
      deadStock,
    })
  } catch (error) {
    console.error('[API/admin/analytics/inventory GET]', error)
    return NextResponse.json({ error: 'Failed to compute inventory analytics' }, { status: 500 })
  }
}

