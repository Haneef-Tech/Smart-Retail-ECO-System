import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q') || ''
    if (q.length < 2) return NextResponse.json({ pincodes: [] })

    const pincodes = await db.pincode.findMany({
      where: {
        OR: [
          { pincode: { contains: q } },
          { area: { contains: q } },
          { city: { contains: q } },
        ],
      },
      take: 15,
      orderBy: { pincode: 'asc' },
    })
    return NextResponse.json({ pincodes })
  } catch (error) {
    console.error('[API/pincodes GET]', error)
    return NextResponse.json({ error: 'Failed to search pincodes' }, { status: 500 })
  }
}
