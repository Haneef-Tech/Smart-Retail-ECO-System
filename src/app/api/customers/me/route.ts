import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuthFromRequest } from '@/lib/auth-util'

export async function GET(req: NextRequest) {
  try {
    const { uid, email } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let customer = await db.customer.findUnique({ where: { id: uid } })
    if (!customer && email) {
      customer = await db.customer.findUnique({ where: { email: email.toLowerCase().trim() } })
    }

    return NextResponse.json({ customer: customer || null })
  } catch (error) {
    console.error('[API/customers/me GET]', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email: tokenEmail, name: tokenName } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, email, phone, houseStreet, area, city, state, pincode } = body

    const targetEmail = (email || tokenEmail || `${uid}@smartretail.com`).toLowerCase().trim()
    const targetName = (name || tokenName || 'Store Customer').trim()
    const targetPhone = (phone || '+91 98765 43210').trim()

    // Find existing customer by id or email
    let customer = await db.customer.findUnique({ where: { id: uid } })
    if (!customer && targetEmail) {
      customer = await db.customer.findUnique({ where: { email: targetEmail } })
    }

    if (customer) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          name: targetName,
          phone: targetPhone,
          houseStreet: houseStreet || customer.houseStreet || 'Mydukur',
          area: area || customer.area || 'Mydukur',
          city: city || customer.city || 'Kadapa',
          state: state || customer.state || 'Andhra Pradesh',
          pincode: pincode || customer.pincode || '516172',
        },
      })
    } else {
      // Avoid unique email constraint failure
      const emailConflict = await db.customer.findUnique({ where: { email: targetEmail } })
      const safeEmail = emailConflict ? `${uid}_${Date.now()}@smartretail.com` : targetEmail

      customer = await db.customer.create({
        data: {
          id: uid,
          name: targetName,
          email: safeEmail,
          phone: targetPhone,
          houseStreet: houseStreet || 'Mydukur',
          area: area || 'Mydukur',
          city: city || 'Kadapa',
          state: state || 'Andhra Pradesh',
          pincode: pincode || '516172',
        },
      })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('[API/customers/me POST]', error)
    return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { uid, email } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    let customer = await db.customer.findUnique({ where: { id: uid } })
    if (!customer && email) {
      customer = await db.customer.findUnique({ where: { email: email.toLowerCase().trim() } })
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updated = await db.customer.update({
      where: { id: customer.id },
      data: body,
    })

    return NextResponse.json({ customer: updated })
  } catch (error) {
    console.error('[API/customers/me PATCH]', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}
