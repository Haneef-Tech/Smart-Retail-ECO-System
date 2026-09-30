import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateQuery } from '@/lib/api-response'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { guardRoles } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { denied } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  const limited = await checkRateLimit(req, 'standard')
  if (limited) return limited
  try {
    const parsed = validateQuery(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), req)
    if (!parsed.ok) return parsed.response
    const days = parsed.data.days

    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)

    const sales = await db.sale.findMany({
      where: { createdAt: { gte: dateLimit } },
      include: {
        saleItems: { include: { product: { select: { name: true, sku: true, categoryId: true } } } },
      },
    })

    const categories = await db.category.findMany()
    const catNameMap = new Map(categories.map((c) => [c.id, c.name]))

    let totalRevenue = 0
    let totalTax = 0
    let totalUnits = 0

    const categoryBreakdown: Record<string, { revenue: number; units: number }> = {}
    const productSalesMap: Record<string, { name: string; sku: string; units: number; revenue: number }> = {}

    sales.forEach((s) => {
      totalRevenue += s.totalAmount
      totalTax += s.taxAmount

      s.saleItems.forEach((item) => {
        totalUnits += item.quantity
        const catName = catNameMap.get(item.product.categoryId) || 'Uncategorized'

        if (!categoryBreakdown[catName]) categoryBreakdown[catName] = { revenue: 0, units: 0 }
        categoryBreakdown[catName].revenue += item.total
        categoryBreakdown[catName].units += item.quantity

        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.product.name, sku: item.product.sku, units: 0, revenue: 0 }
        }
        productSalesMap[item.productId].units += item.quantity
        productSalesMap[item.productId].revenue += item.total
      })
    })

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const averageOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0

    return NextResponse.json({
      periodDays: days,
      totalSalesCount: sales.length,
      totalRevenue,
      totalTax,
      totalUnits,
      averageOrderValue,
      categoryBreakdown,
      topProducts,
    })
  } catch (error) {
    console.error('[API/admin/analytics/sales GET]', error)
    return NextResponse.json({ error: 'Failed to compute sales analytics' }, { status: 500 })
  }
}

