import { NextResponse } from 'next/server'
import { generateDemandForecasts } from '@/lib/forecasting/engine'
import { calculateReorderRecommendations } from '@/lib/forecasting/reorder'
import { diagnoseDeadStock } from '@/lib/forecasting/deadstock'
import { detectSalesOpportunities } from '@/lib/forecasting/opportunity'
import { compareSuppliersForProduct } from '@/lib/forecasting/suppliers'

export async function GET() {
  try {
    const forecasts = await generateDemandForecasts()
    const reorders = await calculateReorderRecommendations(forecasts)
    const deadStock = await diagnoseDeadStock()
    const opportunities = await detectSalesOpportunities()

    // Sample supplier comparison for primary school bag or first product
    const targetProduct = forecasts.find((f) => f.productName.toLowerCase().includes('school bag')) || forecasts[0]
    const supplierComparison = targetProduct ? await compareSuppliersForProduct(targetProduct.productId) : []

    return NextResponse.json({
      success: true,
      summary: {
        totalForecastedProducts: forecasts.length,
        recommendedReordersCount: reorders.length,
        deadStockAlertsCount: deadStock.length,
        salesOpportunitiesCount: opportunities.length,
      },
      forecasts,
      reorders,
      deadStock,
      opportunities,
      supplierComparison,
      targetProductName: targetProduct?.productName || 'School Bag',
    })
  } catch (error) {
    console.error('[API/admin/forecasting GET]', error)
    return NextResponse.json({ error: 'Forecasting engine execution failed' }, { status: 500 })
  }
}
