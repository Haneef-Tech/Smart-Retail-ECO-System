import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const rates = await db.gstRate.findMany()
    return NextResponse.json({ rates })
  } catch (error) {
    console.error('[API/gst GET]', error)
    return NextResponse.json({ error: 'Failed to fetch GST rates' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, rate } = body
    if (!category || rate === undefined) {
      return NextResponse.json({ error: 'category and rate required' }, { status: 400 })
    }
    const updated = await db.gstRate.update({
      where: { category },
      data: { rate: parseFloat(rate) },
    })
    return NextResponse.json({ rate: updated })
  } catch (error) {
    console.error('[API/gst PATCH]', error)
    return NextResponse.json({ error: 'Failed to update GST rate' }, { status: 500 })
  }
}
