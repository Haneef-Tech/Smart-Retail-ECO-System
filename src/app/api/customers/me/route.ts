import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminAuth } from '@/lib/firebase-admin'

async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice(7).trim()
  if (!token) return null

  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      return decoded.uid
    } catch {
      // Continue to the local development fallback.
    }
  }

  return token === 'admin-token-haneef123' ? 'admin-uid-haneef123' : null
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const customer = await db.customer.findUnique({ where: { id: uid } })
    if (!customer) return NextResponse.json({ customer: null })
    return NextResponse.json({ customer })
  } catch (error) {
    console.error('[API/customers/me GET]', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { name, email, phone, houseStreet, area, city, state, pincode } = body
    const customer = await db.customer.upsert({
      where: { id: uid },
      update: { name, phone, houseStreet, area, city, state, pincode },
      create: { id: uid, name, email, phone, houseStreet, area, city, state, pincode },
    })
    return NextResponse.json({ customer })
  } catch (error) {
    console.error('[API/customers/me POST]', error)
    return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const customer = await db.customer.update({
      where: { id: uid },
      data: body,
    })
    return NextResponse.json({ customer })
  } catch (error) {
    console.error('[API/customers/me PATCH]', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}
