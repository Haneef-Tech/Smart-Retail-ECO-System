import { db } from '@/lib/db'

export interface SeasonalInsight {
  eventId: string
  eventName: string
  startDate: string
  endDate: string
  affectedCategories: string[]
  historicalLiftPercent: number
  description?: string
  status: 'ACTIVE' | 'UPCOMING' | 'PAST'
  impactedProductsCount: number
  recommendedStockMultiplier: number
}

export async function getSeasonalIntelligence(): Promise<SeasonalInsight[]> {
  const events = await db.seasonalEvent.findMany({
    orderBy: { startDate: 'asc' },
  })

  const now = new Date()
  const results: SeasonalInsight[] = []

  for (const event of events) {
    const categories = event.affectedCategories.split(',').map((c) => c.trim())

    // Determine status
    let status: 'ACTIVE' | 'UPCOMING' | 'PAST' = 'UPCOMING'
    if (now >= event.startDate && now <= event.endDate) {
      status = 'ACTIVE'
    } else if (now > event.endDate) {
      status = 'PAST'
    }

    // Count impacted products
    const productsCount = await db.product.count({
      where: {
        category: { name: { in: categories } },
        isActive: true,
      },
    })

    const lift = event.historicalLiftPercent || 30.0
    const recommendedStockMultiplier = 1 + lift / 100.0

    results.push({
      eventId: event.id,
      eventName: event.name,
      startDate: event.startDate.toISOString().slice(0, 10),
      endDate: event.endDate.toISOString().slice(0, 10),
      affectedCategories: categories,
      historicalLiftPercent: lift,
      description: event.description || undefined,
      status,
      impactedProductsCount: productsCount,
      recommendedStockMultiplier,
    })
  }

  return results
}

