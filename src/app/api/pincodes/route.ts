import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { validate, validateQuery } from '@/lib/api-response'
import { searchQuerySchema } from '@/lib/validators/common'

export async function GET(req: NextRequest) {
  try {
    const q = validateQuery(searchQuerySchema(50), req)
    if (!q.ok) return q.response
    const term = (q.data.q || '').trim()
    if (term.length < 2) return NextResponse.json({ pincodes: [] })

    const pincodes = await withDbRetry(() =>
      db.pincode.findMany({
        where: {
          OR: [
            { pincode: { contains: term } },
            { area: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 15,
        orderBy: { pincode: 'asc' },
      })
    )
    return NextResponse.json({ pincodes })
  } catch (error) {
    console.error('[API/pincodes GET]', error)
    return NextResponse.json({ error: 'Pincode service temporarily unavailable, please retry' }, { status: 503 })
  }
}
