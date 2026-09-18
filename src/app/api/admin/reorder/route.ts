import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        supplier: true,
        inventory: true,
      },
      orderBy: { name: 'asc' },
    })

    const reorderItems = []
    const allProductsSummary = []
    let totalLowStockCount = 0

    for (const p of products) {
      const currentStock = p.inventory?.availableQuantity ?? 0
      const isLow = currentStock <= p.reorderLevel
      const unitCost = Math.round(p.sellingPrice * 0.75)
      const suggestedQty = Math.max(15, p.reorderLevel * 2 - currentStock)
      const totalCost = suggestedQty * unitCost

      const status =
        currentStock === 0
          ? 'CRITICAL_OUT'
          : currentStock <= p.safetyStock
          ? 'URGENT'
          : isLow
          ? 'HIGH'
          : 'OPTIMAL'

      const itemData = {
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        categoryName: p.category.name,
        supplierId: p.supplierId || '',
        supplierName: p.supplier?.name || 'Primary Supplier',
        supplierCode: p.supplier?.code || 'SUP',
        supplierLeadTime: p.supplier?.leadTimeDays ?? p.leadTimeDays,
        supplierRating: p.supplier?.rating ?? 4.8,
        currentStock,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        aiDecidedUnits: suggestedQty,
        unitCost,
        totalOrderCost: totalCost,
        urgency: status,
        aiReason: isLow
          ? `Available stock (${currentStock}) is at or below reorder threshold (${p.reorderLevel}). Ordering ${suggestedQty} units guarantees ${Math.round(suggestedQty / 3)} days of safe coverage with ${p.supplier?.leadTimeDays ?? 2}d supplier lead time.`
          : `Stock level is healthy (${currentStock} units vs threshold of ${p.reorderLevel}).`,
      }

      allProductsSummary.push(itemData)

      if (isLow) {
        totalLowStockCount++
        reorderItems.push(itemData)
      }
    }

    // Sort reorders by most urgent first (lowest stock first)
    reorderItems.sort((a, b) => a.currentStock - b.currentStock)

    return NextResponse.json({
      totalLowStockCount,
      totalActiveProducts: products.length,
      recommendations: reorderItems,
      allProducts: allProductsSummary,
    })
  } catch (error) {
    console.error('[API/admin/reorder GET]', error)
    return NextResponse.json({ error: 'Failed to calculate autonomous reorder' }, { status: 500 })
  }
}
