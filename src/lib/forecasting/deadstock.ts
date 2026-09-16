import { db } from '@/lib/db'

export interface DeadStockItem {
  productId: string
  sku: string
  productName: string
  categoryName: string
  availableStock: number
  stockValuation: number
  marginPercent: number
  unitsSold30Days: number
  daysSinceLastSale: number
  status: 'DEAD_STOCK' | 'SLOW_MOVING' | 'OVERSTOCK' | 'HEALTHY'
  suggestedAction: 'Stop replenishment' | 'Promotion' | 'Bundle' | 'Discount' | 'Placement change'
  actionReason: string
}

export async function diagnoseDeadStock(): Promise<DeadStockItem[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true, inventory: true },
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const items: DeadStockItem[] = []

  for (const p of products) {
    const stock = p.inventory?.availableQuantity ?? 0
    if (stock === 0) continue

    // Fetch 30-day order items
    const orderItems = await db.orderItem.findMany({
      where: { productId: p.id, order: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } } },
    })

    const unitsSold30 = orderItems.reduce((acc, i) => acc + i.quantity, 0)
    const valuation = stock * p.sellingPrice

    // Estimate margin percent
    const cost = p.sellingPrice * 0.75
    const marginPercent = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - cost) / p.sellingPrice) * 100) : 25

    // Get last order date
    const lastOrderItem = await db.orderItem.findFirst({
      where: { productId: p.id, order: { status: { not: 'CANCELLED' } } },
      orderBy: { order: { createdAt: 'desc' } },
      include: { order: { select: { createdAt: true } } },
    })

    let daysSinceLastSale = 90
    if (lastOrderItem?.order?.createdAt) {
      const diffMs = Date.now() - new Date(lastOrderItem.order.createdAt).getTime()
      daysSinceLastSale = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }

    let status: 'DEAD_STOCK' | 'SLOW_MOVING' | 'OVERSTOCK' | 'HEALTHY' = 'HEALTHY'
    let suggestedAction: 'Stop replenishment' | 'Promotion' | 'Bundle' | 'Discount' | 'Placement change' = 'Stop replenishment'
    let actionReason = ''

    if (unitsSold30 === 0 && stock > 20) {
      status = 'DEAD_STOCK'
      suggestedAction = 'Discount'
      actionReason = `Zero sales in 30 days with ${stock} units tied up in warehouse (₹${valuation.toLocaleString('en-IN')}). Apply 20% clearance discount.`
    } else if (unitsSold30 === 0 && stock > 0) {
      status = 'DEAD_STOCK'
      suggestedAction = 'Placement change'
      actionReason = `No sales recorded recently. Feature product on primary category showcase or homepage banner.`
    } else if (unitsSold30 < 3 && stock > 50) {
      status = 'SLOW_MOVING'
      suggestedAction = 'Bundle'
      actionReason = `Low sales velocity (${unitsSold30} units/month) with high stock (${stock} units). Bundle with high-demand complementary product.`
    } else if (stock > 200) {
      status = 'OVERSTOCK'
      suggestedAction = 'Promotion'
      actionReason = `Warehouse overstock of ${stock} units. Trigger limited-time promotional campaign.`
    }

    if (status !== 'HEALTHY') {
      items.push({
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        categoryName: p.category.name,
        availableStock: stock,
        stockValuation: Math.round(valuation * 100) / 100,
        marginPercent,
        unitsSold30Days: unitsSold30,
        daysSinceLastSale,
        status,
        suggestedAction,
        actionReason,
      })
    }
  }

  return items.sort((a, b) => b.stockValuation - a.stockValuation)
}

