import { db } from '@/lib/db'

export interface EtlResult {
  dailyFactsCount: number
  monthlyFactsCount: number
  performanceEvaluated: number
  snapshotsCreated: number
}

export async function runEtlPipeline(): Promise<EtlResult> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const yearMonthStr = now.toISOString().slice(0, 7) // YYYY-MM
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 1. Process Daily Sales Fact for today
  const todaysOrders = await db.order.findMany({
    where: {
      createdAt: {
        gte: new Date(`${todayStr}T00:00:00.000Z`),
        lte: new Date(`${todayStr}T23:59:59.999Z`),
      },
      status: { not: 'CANCELLED' },
    },
    include: { orderItems: true },
  })

  let todayRevenue = 0
  let todayUnits = 0
  let todayCost = 0
  const orderCount = todaysOrders.length

  for (const order of todaysOrders) {
    todayRevenue += order.total
    for (const item of order.orderItems) {
      todayUnits += item.quantity
      // Estimate COGS at 75% of unit price if cost not tracked separately
      todayCost += item.unitPrice * 0.75 * item.quantity
    }
  }

  const grossProfit = Math.max(0, todayRevenue - todayCost)
  const averageOrderValue = orderCount > 0 ? todayRevenue / orderCount : 0

  await db.dailySalesFact.upsert({
    where: { date: todayStr },
    update: {
      totalRevenue: todayRevenue,
      totalCost: todayCost,
      grossProfit,
      orderCount,
      unitsSold: todayUnits,
      averageOrderValue,
    },
    create: {
      date: todayStr,
      totalRevenue: todayRevenue,
      totalCost: todayCost,
      grossProfit,
      orderCount,
      unitsSold: todayUnits,
      averageOrderValue,
    },
  })

  // 2. Process Monthly Sales Fact
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const monthOrders = await db.order.findMany({
    where: {
      createdAt: { gte: monthStart, lte: monthEnd },
      status: { not: 'CANCELLED' },
    },
    include: { orderItems: true },
  })

  let monthRevenue = 0
  let monthProfit = 0
  let monthUnits = 0

  for (const order of monthOrders) {
    monthRevenue += order.total
    for (const item of order.orderItems) {
      monthUnits += item.quantity
      monthProfit += (item.unitPrice - item.unitPrice * 0.75) * item.quantity
    }
  }

  // Calculate growth rate against previous month if available
  const prevMonthStr = new Date(year, month - 2, 1).toISOString().slice(0, 7)
  const prevFact = await db.monthlySalesFact.findUnique({ where: { yearMonth: prevMonthStr } })
  let growthRate = 0
  if (prevFact && prevFact.totalRevenue > 0) {
    growthRate = ((monthRevenue - prevFact.totalRevenue) / prevFact.totalRevenue) * 100
  }

  await db.monthlySalesFact.upsert({
    where: { yearMonth: yearMonthStr },
    update: {
      totalRevenue: monthRevenue,
      grossProfit: monthProfit,
      orderCount: monthOrders.length,
      unitsSold: monthUnits,
      growthRate,
    },
    create: {
      yearMonth: yearMonthStr,
      year,
      month,
      totalRevenue: monthRevenue,
      grossProfit: monthProfit,
      orderCount: monthOrders.length,
      unitsSold: monthUnits,
      growthRate,
    },
  })

  // 3. Evaluate Product Performance & Stock Coverage Days
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true, inventory: true },
  })

  let performanceEvaluated = 0
  let snapshotsCreated = 0

  for (const p of products) {
    // Sum real orders in 30 days
    const orderItems = await db.orderItem.findMany({
      where: {
        productId: p.id,
        order: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      },
    })
    const orderQty = orderItems.reduce((acc, i) => acc + i.quantity, 0)
    const orderRev = orderItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)

    // Sum historical seed sales in 30 days
    const historical = await db.historicalSale.aggregate({
      where: { sku: p.sku, date: { gte: thirtyDaysAgo } },
      _sum: { quantity: true, revenue: true },
    })
    const histQty = historical._sum.quantity || 0
    const histRev = historical._sum.revenue || 0

    const totalUnits30 = orderQty + histQty
    const totalRev30 = orderRev + histRev
    const avgDailySales = totalUnits30 / 30.0

    const availableStock = p.inventory?.availableQuantity ?? 0
    const reservedQty = p.inventory?.reservedQuantity ?? 0
    const damagedQty = p.inventory?.damagedQuantity ?? 0

    // Stock Coverage Formula: Stock Coverage (Days) = Available Stock / Avg Daily Sales
    let stockCoverageDays = 999.0
    if (avgDailySales > 0) {
      stockCoverageDays = availableStock / avgDailySales
    } else if (availableStock === 0) {
      stockCoverageDays = 0.0
    }

    // Classify velocity
    let velocityClass = 'NORMAL'
    if (avgDailySales >= 5.0) {
      velocityClass = 'FAST_MOVING'
    } else if (avgDailySales >= 1.0) {
      velocityClass = 'NORMAL'
    } else if (avgDailySales > 0) {
      velocityClass = 'SLOW_MOVING'
    } else if (availableStock > 0) {
      velocityClass = 'DEAD_STOCK'
    } else {
      velocityClass = 'OUT_OF_STOCK'
    }

    // Update ProductPerformance
    const existingPerf = await db.productPerformance.findFirst({ where: { productId: p.id } })
    if (existingPerf) {
      await db.productPerformance.update({
        where: { id: existingPerf.id },
        data: {
          sku: p.sku,
          productName: p.name,
          categoryName: p.category.name,
          unitsSold30Days: totalUnits30,
          revenue30Days: totalRev30,
          avgDailySales,
          stockCoverageDays,
          velocityClass,
          lastCalculatedAt: now,
        },
      })
    } else {
      await db.productPerformance.create({
        data: {
          productId: p.id,
          sku: p.sku,
          productName: p.name,
          categoryName: p.category.name,
          unitsSold30Days: totalUnits30,
          revenue30Days: totalRev30,
          avgDailySales,
          stockCoverageDays,
          velocityClass,
          lastCalculatedAt: now,
        },
      })
    }
    performanceEvaluated++

    // Create InventorySnapshot
    await db.inventorySnapshot.create({
      data: {
        snapshotDate: now,
        productId: p.id,
        sku: p.sku,
        availableQuantity: availableStock,
        reservedQuantity: reservedQty,
        damagedQuantity: damagedQty,
        totalValuation: availableStock * p.sellingPrice,
        stockCoverageDays,
      },
    })
    snapshotsCreated++
  }

  return {
    dailyFactsCount: 1,
    monthlyFactsCount: 1,
    performanceEvaluated,
    snapshotsCreated,
  }
}

