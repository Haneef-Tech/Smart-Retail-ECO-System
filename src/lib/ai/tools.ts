import { db } from '@/lib/db'

export interface ToolResult {
  toolName: string
  success: boolean
  data: unknown
  period?: string
  source?: string
  confidence?: number
}

// Security & argument bounds validator helper
function validateLimit(limit?: number, max = 50, defaultVal = 10): number {
  if (limit === undefined || typeof limit !== 'number' || isNaN(limit)) return defaultVal
  return Math.min(Math.max(1, Math.floor(limit)), max)
}

// 1. get_today_sales
export async function get_today_sales(): Promise<ToolResult> {
  const todayStr = new Date().toISOString().slice(0, 10)
  const start = new Date(`${todayStr}T00:00:00.000Z`)
  const end = new Date(`${todayStr}T23:59:59.999Z`)

  const orders = await db.order.findMany({
    where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    include: { orderItems: true },
  })

  let totalRevenue = 0
  let unitsSold = 0
  let totalCost = 0
  for (const o of orders) {
    totalRevenue += o.total
    for (const item of o.orderItems) {
      unitsSold += item.quantity
      totalCost += item.unitPrice * 0.75 * item.quantity
    }
  }

  const grossProfit = Math.max(0, totalRevenue - totalCost)
  const orderCount = orders.length
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0

  return {
    toolName: 'get_today_sales',
    success: true,
    period: `Today (${todayStr})`,
    source: 'Operational DB (Order & OrderItem tables)',
    confidence: 100,
    data: {
      date: todayStr,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount,
      unitsSold,
      grossProfit: Math.round(grossProfit * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    },
  }
}

// 2. get_sales_by_date_range
export async function get_sales_by_date_range(startDate: string, endDate: string): Promise<ToolResult> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { toolName: 'get_sales_by_date_range', success: false, data: 'Invalid date format. Use YYYY-MM-DD.' }
  }

  const orders = await db.order.findMany({
    where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    include: { orderItems: true },
  })

  let totalRevenue = 0
  let unitsSold = 0
  for (const o of orders) {
    totalRevenue += o.total
    for (const item of o.orderItems) unitsSold += item.quantity
  }

  return {
    toolName: 'get_sales_by_date_range',
    success: true,
    period: `${startDate} to ${endDate}`,
    source: 'Operational DB (Orders)',
    confidence: 100,
    data: {
      startDate,
      endDate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount: orders.length,
      unitsSold,
    },
  }
}

// 3. get_sales_by_product
export async function get_sales_by_product(productIdOrName: string): Promise<ToolResult> {
  const safeQuery = (productIdOrName || '').trim()
  const product = await db.product.findFirst({
    where: {
      OR: [
        { id: safeQuery },
        { sku: safeQuery },
        { name: { contains: safeQuery } },
      ],
    },
    include: { inventory: true },
  })

  if (!product) {
    return { toolName: 'get_sales_by_product', success: false, data: `No product found matching "${safeQuery}".` }
  }

  const items = await db.orderItem.findMany({
    where: { productId: product.id, order: { status: { not: 'CANCELLED' } } },
  })

  const historical = await db.historicalSale.aggregate({
    where: { sku: product.sku },
    _sum: { quantity: true, revenue: true },
  })

  const orderUnits = items.reduce((acc, i) => acc + i.quantity, 0)
  const orderRev = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
  const histUnits = historical._sum.quantity || 0
  const histRev = historical._sum.revenue || 0

  const totalUnits = orderUnits + histUnits
  const totalRev = orderRev + histRev
  const avgDailySales = totalUnits / 30.0
  const stock = product.inventory?.availableQuantity ?? 0
  const stockCoverageDays = avgDailySales > 0 ? stock / avgDailySales : stock > 0 ? 999 : 0

  return {
    toolName: 'get_sales_by_product',
    success: true,
    period: 'Last 30 days + Total History',
    source: 'Operational OrderItem & HistoricalSale tables',
    confidence: 100,
    data: {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      availableStock: stock,
      totalUnitsSold: totalUnits,
      totalRevenue: Math.round(totalRev * 100) / 100,
      avgDailySales: Math.round(avgDailySales * 100) / 100,
      stockCoverageDays: Math.round(stockCoverageDays * 10) / 10,
    },
  }
}

// 4. get_monthly_sales
export async function get_monthly_sales(yearMonth?: string): Promise<ToolResult> {
  const ym = yearMonth || new Date().toISOString().slice(0, 7)
  const fact = await db.monthlySalesFact.findUnique({ where: { yearMonth: ym } })

  if (!fact) {
    // Calculate dynamically from orders if fact table not populated
    const [yearStr, monthStr] = ym.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    if (isNaN(year) || isNaN(month)) {
      return { toolName: 'get_monthly_sales', success: false, data: 'Invalid year-month format. Use YYYY-MM.' }
    }

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    const orders = await db.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      include: { orderItems: true },
    })

    let rev = 0
    let units = 0
    for (const o of orders) {
      rev += o.total
      for (const i of o.orderItems) units += i.quantity
    }

    return {
      toolName: 'get_monthly_sales',
      success: true,
      period: `Month ${ym}`,
      source: 'Operational Orders Table (Calculated)',
      confidence: 90,
      data: { yearMonth: ym, totalRevenue: rev, orderCount: orders.length, unitsSold: units, growthRate: 0 },
    }
  }

  return {
    toolName: 'get_monthly_sales',
    success: true,
    period: `Month ${ym}`,
    source: 'MonthlySalesFact Table',
    confidence: 100,
    data: fact,
  }
}

// 5. get_top_products
export async function get_top_products(limitArg?: number): Promise<ToolResult> {
  const limit = validateLimit(limitArg, 20, 5)
  const performances = await db.productPerformance.findMany({
    orderBy: { revenue30Days: 'desc' },
    take: limit,
    include: { product: true },
  })

  return {
    toolName: 'get_top_products',
    success: true,
    period: 'Last 30 Days',
    source: 'ProductPerformance Fact Table',
    confidence: 100,
    data: performances.map((p) => ({
      sku: p.sku,
      productName: p.productName,
      categoryName: p.categoryName,
      unitsSold30Days: p.unitsSold30Days,
      revenue30Days: p.revenue30Days,
      avgDailySales: p.avgDailySales,
      velocityClass: p.velocityClass,
    })),
  }
}

// 6. get_product_details
export async function get_product_details(query: string): Promise<ToolResult> {
  const safeQuery = (query || '').trim()
  const product = await db.product.findFirst({
    where: {
      OR: [
        { id: safeQuery },
        { sku: safeQuery },
        { name: { contains: safeQuery } },
      ],
    },
    include: { category: true, supplier: true, inventory: true },
  })

  if (!product) {
    return { toolName: 'get_product_details', success: false, data: `No product found for query "${safeQuery}".` }
  }

  return {
    toolName: 'get_product_details',
    success: true,
    period: 'Current Live State',
    source: 'Product & Inventory Database Schema',
    confidence: 100,
    data: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category.name,
      supplier: product.supplier?.name || 'N/A',
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      availableStock: product.inventory?.availableQuantity ?? 0,
      reorderLevel: product.reorderLevel,
      safetyStock: product.safetyStock,
      leadTimeDays: product.leadTimeDays,
      unit: product.unit,
      description: product.description,
    },
  }
}

// 7. get_current_inventory
export async function get_current_inventory(): Promise<ToolResult> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { inventory: true, category: true },
  })

  let totalStockValuation = 0
  let totalAvailableUnits = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  const categoryBreakdown: Record<string, { units: number; valuation: number }> = {}

  for (const p of products) {
    const stock = p.inventory?.availableQuantity ?? 0
    const val = stock * p.sellingPrice
    totalStockValuation += val
    totalAvailableUnits += stock

    if (stock === 0) outOfStockCount++
    else if (stock <= p.reorderLevel) lowStockCount++

    const cat = p.category.name
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { units: 0, valuation: 0 }
    categoryBreakdown[cat].units += stock
    categoryBreakdown[cat].valuation += val
  }

  return {
    toolName: 'get_current_inventory',
    success: true,
    period: 'Real-time Live Inventory Ledger',
    source: 'Product & Inventory tables',
    confidence: 100,
    data: {
      totalProducts: products.length,
      totalAvailableUnits,
      totalStockValuation: Math.round(totalStockValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
      categoryBreakdown,
    },
  }
}

// 8. get_low_stock_products
export async function get_low_stock_products(): Promise<ToolResult> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { inventory: true, category: true, supplier: true },
  })

  const lowStock = products
    .filter((p) => (p.inventory?.availableQuantity ?? 0) <= p.reorderLevel)
    .map((p) => {
      const stock = p.inventory?.availableQuantity ?? 0
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        supplier: p.supplier?.name || 'Primary Supplier',
        availableStock: stock,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        status: stock === 0 ? 'OUT_OF_STOCK' : stock <= p.safetyStock ? 'CRITICAL_SAFETY' : 'REORDER_THRESHOLD',
      }
    })

  return {
    toolName: 'get_low_stock_products',
    success: true,
    period: 'Current Warehouse State',
    source: 'Inventory & Reorder Rules',
    confidence: 100,
    data: {
      totalLowStock: lowStock.length,
      products: lowStock,
    },
  }
}

// 9. get_stock_movements
export async function get_stock_movements(productId?: string, limitArg?: number): Promise<ToolResult> {
  const limit = validateLimit(limitArg, 50, 10)
  const where: Record<string, unknown> = {}
  if (productId) where.productId = productId

  const txns = await db.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { product: { select: { name: true, sku: true } } },
  })

  return {
    toolName: 'get_stock_movements',
    success: true,
    period: 'Recent Transaction Ledger',
    source: 'InventoryTransaction Audit Log',
    confidence: 100,
    data: txns.map((t) => ({
      id: t.id,
      productName: t.product.name,
      sku: t.product.sku,
      transactionType: t.transactionType,
      quantity: t.quantity,
      previousQuantity: t.previousQuantity,
      newQuantity: t.newQuantity,
      createdAt: t.createdAt.toISOString(),
    })),
  }
}

// 10. get_order_details
export async function get_order_details(orderId?: string, limitArg?: number): Promise<ToolResult> {
  if (orderId) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, customer: true, bill: true },
    })
    if (!order) return { toolName: 'get_order_details', success: false, data: `Order ${orderId} not found.` }
    return { toolName: 'get_order_details', success: true, period: `Order ${orderId}`, source: 'Order Schema', confidence: 100, data: order }
  }

  const limit = validateLimit(limitArg, 20, 5)
  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { orderItems: true, customer: { select: { name: true, email: true } } },
  })

  return {
    toolName: 'get_order_details',
    success: true,
    period: `Latest ${orders.length} Orders`,
    source: 'Order Schema',
    confidence: 100,
    data: orders,
  }
}

// 11. get_bill_details
export async function get_bill_details(orderIdOrBillNumber?: string): Promise<ToolResult> {
  const safeQuery = (orderIdOrBillNumber || '').trim()
  let bill = null
  if (safeQuery) {
    bill = await db.bill.findFirst({
      where: { OR: [{ billNumber: safeQuery }, { orderId: safeQuery }] },
      include: { order: { include: { orderItems: true, customer: true } } },
    })
  } else {
    bill = await db.bill.findFirst({
      orderBy: { generatedAt: 'desc' },
      include: { order: { include: { orderItems: true, customer: true } } },
    })
  }

  if (!bill) return { toolName: 'get_bill_details', success: false, data: 'No bill found matching query.' }

  return {
    toolName: 'get_bill_details',
    success: true,
    period: `Bill ${bill.billNumber}`,
    source: 'Bill & Order Tables',
    confidence: 100,
    data: bill,
  }
}

// 12. get_purchase_history
export async function get_purchase_history(supplierId?: string): Promise<ToolResult> {
  const where: Record<string, unknown> = {}
  if (supplierId) where.supplierId = supplierId

  const purchases = await db.purchase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { supplier: { select: { name: true } }, purchaseItems: { include: { product: true } } },
  })

  return {
    toolName: 'get_purchase_history',
    success: true,
    period: 'Inbound PO History',
    source: 'Purchase & PurchaseItem Schema',
    confidence: 100,
    data: purchases,
  }
}

// 13. get_supplier_details
export async function get_supplier_details(query?: string): Promise<ToolResult> {
  const safeQuery = (query || '').trim()
  const suppliers = await db.supplier.findMany({
    where: safeQuery
      ? { OR: [{ name: { contains: safeQuery } }, { code: { contains: safeQuery } }] }
      : {},
    include: { products: { select: { id: true, name: true, sku: true } } },
  })

  return {
    toolName: 'get_supplier_details',
    success: true,
    period: 'Supplier Directory',
    source: 'Supplier Model',
    confidence: 100,
    data: suppliers,
  }
}

// 14. get_category_performance
export async function get_category_performance(): Promise<ToolResult> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true, inventory: true },
  })

  const catStats: Record<string, { productCount: number; availableStock: number; totalValuation: number }> = {}

  for (const p of products) {
    const cat = p.category.name
    const stock = p.inventory?.availableQuantity ?? 0
    if (!catStats[cat]) catStats[cat] = { productCount: 0, availableStock: 0, totalValuation: 0 }
    catStats[cat].productCount++
    catStats[cat].availableStock += stock
    catStats[cat].totalValuation += stock * p.sellingPrice
  }

  return {
    toolName: 'get_category_performance',
    success: true,
    period: 'Current Category State',
    source: 'Category & Product Tables',
    confidence: 100,
    data: catStats,
  }
}

// 15. calculate_sales_growth
export async function calculate_sales_growth(period1: string, period2: string): Promise<ToolResult> {
  const fact1 = await db.monthlySalesFact.findUnique({ where: { yearMonth: period1 } })
  const fact2 = await db.monthlySalesFact.findUnique({ where: { yearMonth: period2 } })

  const rev1 = fact1?.totalRevenue || 0
  const rev2 = fact2?.totalRevenue || 0

  let growthRate = 0
  if (rev1 > 0) {
    growthRate = ((rev2 - rev1) / rev1) * 100
  }

  return {
    toolName: 'calculate_sales_growth',
    success: true,
    period: `Comparison: ${period1} vs ${period2}`,
    source: 'MonthlySalesFact',
    confidence: rev1 > 0 ? 100 : 70,
    data: {
      period1,
      revenue1: rev1,
      period2,
      revenue2: rev2,
      growthPercent: Math.round(growthRate * 100) / 100,
    },
  }
}

// 16. calculate_inventory_turnover
export async function calculate_inventory_turnover(): Promise<ToolResult> {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { inventory: true },
  })

  let totalValuation = 0
  for (const p of products) {
    totalValuation += (p.inventory?.availableQuantity ?? 0) * p.sellingPrice
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentOrders = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } } },
  })

  const cogs30 = recentOrders.reduce((acc, item) => acc + item.unitPrice * 0.75 * item.quantity, 0)
  const annualizedCogs = cogs30 * 12
  const turnoverRatio = totalValuation > 0 ? annualizedCogs / totalValuation : 0

  return {
    toolName: 'calculate_inventory_turnover',
    success: true,
    period: 'Annualized 30-Day Basis',
    source: 'Inventory Valuation & COGS',
    confidence: 90,
    data: {
      totalValuation: Math.round(totalValuation * 100) / 100,
      annualizedCogs: Math.round(annualizedCogs * 100) / 100,
      turnoverRatio: Math.round(turnoverRatio * 100) / 100,
    },
  }
}

// 17. calculate_stock_coverage
export async function calculate_stock_coverage(productId?: string): Promise<ToolResult> {
  if (productId) {
    const perf = await db.productPerformance.findFirst({
      where: { OR: [{ productId }, { sku: productId }] },
      include: { product: { include: { inventory: true } } },
    })
    if (!perf) return { toolName: 'calculate_stock_coverage', success: false, data: `No coverage data for ${productId}` }
    return {
      toolName: 'calculate_stock_coverage',
      success: true,
      period: '30-Day Velocity Basis',
      source: 'ProductPerformance Fact Table',
      confidence: 100,
      data: perf,
    }
  }

  const perfs = await db.productPerformance.findMany({
    orderBy: { stockCoverageDays: 'asc' },
    take: 15,
  })

  return {
    toolName: 'calculate_stock_coverage',
    success: true,
    period: 'All Catalog 30-Day Basis',
    source: 'ProductPerformance Fact Table',
    confidence: 100,
    data: perfs,
  }
}

// 18. search_knowledge_base
export async function search_knowledge_base(query: string): Promise<ToolResult> {
  const safeQuery = (query || '').trim()
  const docs = await db.knowledgeDocument.findMany({
    where: {
      OR: [
        { title: { contains: safeQuery } },
        { content: { contains: safeQuery } },
        { category: { contains: safeQuery } },
      ],
    },
  })

  if (docs.length === 0) {
    const all = await db.knowledgeDocument.findMany({ take: 3 })
    return {
      toolName: 'search_knowledge_base',
      success: true,
      period: 'Knowledge Base Policy Documents',
      source: 'KnowledgeDocument Table',
      confidence: 70,
      data: all,
    }
  }

  return {
    toolName: 'search_knowledge_base',
    success: true,
    period: 'Knowledge Base Documents',
    source: 'KnowledgeDocument Table',
    confidence: 100,
    data: docs,
  }
}

// 19. forecast_product_demand
export async function forecast_product_demand(productId?: string): Promise<ToolResult> {
  const recs = await db.aiRecommendation.findMany({
    where: productId ? { productId, status: 'PENDING' } : { status: 'PENDING' },
    include: { product: { include: { inventory: true, supplier: true } } },
    take: 5,
  })

  return {
    toolName: 'forecast_product_demand',
    success: true,
    period: '30-Day Forward Demand Horizon',
    source: 'AiRecommendation & Forecast Models',
    confidence: 95,
    data: recs,
  }
}

// 20. get_seasonal_events
export async function get_seasonal_events(): Promise<ToolResult> {
  const events = await db.seasonalEvent.findMany({
    orderBy: { startDate: 'asc' },
  })

  return {
    toolName: 'get_seasonal_events',
    success: true,
    period: 'Annual Retail Calendar',
    source: 'SeasonalEvent Table',
    confidence: 100,
    data: events,
  }
}

