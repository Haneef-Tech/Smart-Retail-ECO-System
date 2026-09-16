import { DemandForecastResult } from './engine'
import { db } from '@/lib/db'

export interface ReorderRecommendation {
  productId: string
  sku: string
  productName: string
  categoryName: string
  supplierName: string
  supplierCode: string
  currentStock: number
  safetyStock: number
  confirmedIncomingStock: number
  forecastDemand: number
  reorderPoint: number
  recommendedPurchaseQty: number // Exact deterministic calculation result
  leadTimeDays: number
  unitPrice: number
  totalOrderCost: number
  urgency: 'HIGH' | 'MEDIUM' | 'LOW' | 'OPTIMAL'
  calculationFormula: string
}

export async function calculateReorderRecommendations(
  forecasts: DemandForecastResult[]
): Promise<ReorderRecommendation[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { supplier: true, inventory: true },
  })
  const prodMap = Object.fromEntries(products.map((p) => [p.id, p]))

  const events = await db.seasonalEvent.findMany()

  const recommendations: ReorderRecommendation[] = []

  for (const f of forecasts) {
    const p = prodMap[f.productId]
    if (!p) continue

    const currentStock = p.inventory?.availableQuantity ?? 0
    const safetyStock = p.safetyStock
    const leadTimeDays = p.leadTimeDays

    // Calculate confirmed incoming PO stock for this product
    const pendingPoItems = await db.purchaseItem.findMany({
      where: { productId: p.id, purchase: { status: 'PENDING' } },
    })
    const confirmedIncomingStock = pendingPoItems.reduce((acc, item) => acc + item.quantity, 0)

    // Check for active seasonal lift factor
    const activeEvent = events.find((e) =>
      e.affectedCategories.toLowerCase().includes(f.categoryName.toLowerCase())
    )
    const seasonalLift = activeEvent ? 1 + (activeEvent.historicalLiftPercent || 30) / 100 : 1.0

    // Dynamic Reorder Point Formula: Reorder Point = (Avg Daily Demand * Lead Time * Seasonal Lift) + Safety Stock
    const reorderPoint = Math.round(f.avgDailySales * leadTimeDays * seasonalLift + safetyStock)

    // Deterministic Reorder Engine Formula: Recommended Purchase = Forecast Demand + Safety Stock - Current Stock - Incoming
    const rawRecommended = f.forecastQuantity + safetyStock - currentStock - confirmedIncomingStock
    const recommendedPurchaseQty = Math.max(0, Math.round(rawRecommended))

    let urgency: 'HIGH' | 'MEDIUM' | 'LOW' | 'OPTIMAL' = 'OPTIMAL'
    if (currentStock <= safetyStock && recommendedPurchaseQty > 0) {
      urgency = 'HIGH'
    } else if (currentStock <= reorderPoint && recommendedPurchaseQty > 0) {
      urgency = 'MEDIUM'
    } else if (recommendedPurchaseQty > 0) {
      urgency = 'LOW'
    }

    if (recommendedPurchaseQty > 0 || currentStock <= reorderPoint) {
      recommendations.push({
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        categoryName: f.categoryName,
        supplierName: p.supplier?.name || 'Primary Supplier',
        supplierCode: p.supplier?.code || 'S001',
        currentStock,
        safetyStock,
        confirmedIncomingStock,
        forecastDemand: f.forecastQuantity,
        reorderPoint,
        recommendedPurchaseQty,
        leadTimeDays,
        unitPrice: p.sellingPrice,
        totalOrderCost: Math.round(recommendedPurchaseQty * p.sellingPrice * 0.75),
        urgency,
        calculationFormula: `${f.forecastQuantity} (Forecast) + ${safetyStock} (Safety) - ${currentStock} (Stock) - ${confirmedIncomingStock} (Incoming) = ${recommendedPurchaseQty} units`,
      })
    }
  }

  return recommendations.sort((a, b) => {
    const weight = { HIGH: 3, MEDIUM: 2, LOW: 1, OPTIMAL: 0 }
    return weight[b.urgency] - weight[a.urgency]
  })
}

