import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runEtlPipeline } from '@/lib/etl'

export async function GET() {
  try {
    // Ensure performance & coverage table is populated
    const perfCount = await db.productPerformance.count()
    if (perfCount === 0) {
      await runEtlPipeline()
    }

    const performances = await db.productPerformance.findMany({
      include: {
        product: {
          include: {
            inventory: true,
            supplier: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { stockCoverageDays: 'asc' },
    })

    const items = performances.map((p) => {
      const stock = p.product.inventory?.availableQuantity ?? 0
      let riskLevel: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'OVERSTOCK' | 'DEAD_STOCK' = 'HEALTHY'

      if (p.velocityClass === 'DEAD_STOCK') {
        riskLevel = 'DEAD_STOCK'
      } else if (p.stockCoverageDays < 7.0 && stock > 0) {
        riskLevel = 'CRITICAL'
      } else if (p.stockCoverageDays < 14.0 && stock > 0) {
        riskLevel = 'LOW'
      } else if (p.stockCoverageDays > 60.0) {
        riskLevel = 'OVERSTOCK'
      }

      return {
        id: p.id,
        productId: p.productId,
        sku: p.sku,
        productName: p.productName,
        categoryName: p.categoryName,
        availableStock: stock,
        reorderLevel: p.product.reorderLevel,
        leadTimeDays: p.product.leadTimeDays,
        unitsSold30Days: p.unitsSold30Days,
        avgDailySales: Math.round(p.avgDailySales * 100) / 100,
        stockCoverageDays: Math.round(p.stockCoverageDays * 10) / 10,
        velocityClass: p.velocityClass,
        riskLevel,
        supplierName: p.product.supplier?.name || 'N/A',
        sellingPrice: p.product.sellingPrice,
      }
    })

    const summary = {
      totalProducts: items.length,
      criticalCount: items.filter((i) => i.riskLevel === 'CRITICAL').length,
      lowCount: items.filter((i) => i.riskLevel === 'LOW').length,
      healthyCount: items.filter((i) => i.riskLevel === 'HEALTHY').length,
      overstockCount: items.filter((i) => i.riskLevel === 'OVERSTOCK').length,
      deadStockCount: items.filter((i) => i.riskLevel === 'DEAD_STOCK').length,
    }

    return NextResponse.json({ summary, items })
  } catch (error) {
    console.error('[API/admin/analytics/coverage GET]', error)
    return NextResponse.json({ error: 'Failed to fetch stock coverage analysis' }, { status: 500 })
  }
}

