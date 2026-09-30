import { NextResponse } from 'next/server'
import { guardRoles } from '@/lib/auth-guard'
import { runEtlPipeline } from '@/lib/etl'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST() {
  const { denied } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  // Heavy pipeline: 10 runs/min per user
  const limited = await checkRateLimit(null, 'heavy')
  if (limited) return limited
  try {
    const result = await runEtlPipeline()
    return NextResponse.json({
      success: true,
      message: 'Daily ETL pipeline executed successfully.',
      data: result,
    })
  } catch (error) {
    console.error('[API/admin/etl/run POST]', error)
    return NextResponse.json(
      { error: 'ETL execution failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

