import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const productCount = await db.product.count()
    return NextResponse.json({
      status: 'healthy',
      service: 'SmartRetail ECO-System',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      activeProductsInCatalog: productCount,
      database: 'connected',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'SmartRetail ECO-System',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 } // Return 200 so keep-alive pings don't trigger failure alerts
    )
  }
}

