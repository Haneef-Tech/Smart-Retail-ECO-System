import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { guardRoles } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { gstRateSchema } from '@/lib/validators/products'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET() {
  try {
    const rates = await withDbRetry(() => db.gstRate.findMany())
    return NextResponse.json({ rates })
  } catch (error) {
    console.error('[API/gst GET]', error)
    // 503 (not 500): almost always a transient Neon wakeup — client may retry.
    return NextResponse.json({ error: 'GST service temporarily unavailable, please retry' }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest) {
  // Tax-rate writes require staff — this endpoint was previously unauthenticated.
  const { denied, requester } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  if (!requester) return apiError('Unauthorized: sign-in required', 401)
  const limited = await checkRateLimit(req, 'standard', requester.uid)
  if (limited) return limited
  try {
    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(gstRateSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const { category, rate } = parsed.data
    const updated = await db.gstRate.update({
      where: { category },
      data: { rate },
    })
    return NextResponse.json({ rate: updated })
  } catch (error) {
    console.error('[API/gst PATCH]', error)
    return NextResponse.json({ error: 'Failed to update GST rate' }, { status: 500 })
  }
}
