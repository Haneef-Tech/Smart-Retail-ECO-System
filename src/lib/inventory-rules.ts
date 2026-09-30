/**
 * Pure inventory-rule helpers.
 *
 * Formulas mirror:
 * - `src/lib/forecasting/reorder.ts`: reorderPoint, recommendedPurchaseQty, urgency
 * - `src/lib/forecasting/deadstock.ts`: dead-stock / slow-moving / overstock branches
 *
 * No app code was changed to create this file; it exists so the rules can be
 * unit-tested with hand-calculated datasets.
 */

export type Urgency = 'HIGH' | 'MEDIUM' | 'LOW' | 'OPTIMAL'
export type DeadStockStatus = 'DEAD_STOCK' | 'SLOW_MOVING' | 'OVERSTOCK' | 'HEALTHY'

/** Reorder Point = round(avgDailySales * leadTimeDays * seasonalLift + safetyStock) */
export function calculateReorderPoint(
  avgDailySales: number,
  leadTimeDays: number,
  seasonalLift: number,
  safetyStock: number
): number {
  return Math.round(avgDailySales * leadTimeDays * seasonalLift + safetyStock)
}

/** Recommended Purchase = max(0, round(forecast + safety - current - incoming)) */
export function calculateRecommendedQty(
  forecastDemand: number,
  safetyStock: number,
  currentStock: number,
  incomingStock: number
): number {
  return Math.max(0, Math.round(forecastDemand + safetyStock - currentStock - incomingStock))
}

/** Urgency ladder, same branch order as reorder.ts. */
export function classifyUrgency(
  currentStock: number,
  safetyStock: number,
  reorderPoint: number,
  recommendedQty: number
): Urgency {
  if (currentStock <= safetyStock && recommendedQty > 0) return 'HIGH'
  if (currentStock <= reorderPoint && recommendedQty > 0) return 'MEDIUM'
  if (recommendedQty > 0) return 'LOW'
  return 'OPTIMAL'
}

/**
 * Dead-stock classification, same branch order as deadstock.ts.
 * NOTE: zero-stock products are skipped upstream (`if (stock === 0) continue`),
 * so callers should treat stock === 0 as HEALTHY / not-reported.
 */
export function classifyDeadStock(unitsSold30Days: number, stock: number): DeadStockStatus {
  if (stock === 0) return 'HEALTHY'
  if (unitsSold30Days === 0 && stock > 20) return 'DEAD_STOCK'
  if (unitsSold30Days === 0 && stock > 0) return 'DEAD_STOCK'
  if (unitsSold30Days < 3 && stock > 50) return 'SLOW_MOVING'
  if (stock > 200) return 'OVERSTOCK'
  return 'HEALTHY'
}
