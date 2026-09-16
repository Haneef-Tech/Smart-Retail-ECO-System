import { NextResponse } from 'next/server'
import { runEtlPipeline } from '@/lib/etl'

export async function POST() {
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

