import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { extractAuthFromRequest } from '@/lib/auth-util'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { customerUpdateSchema } from '@/lib/validators/checkout'

export async function GET(req: NextRequest) {
  try {
    const { uid, email } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let customer = await withDbRetry(() => db.customer.findUnique({ where: { id: uid } }))
    if (!customer && email) {
      const em = email.toLowerCase().trim()
      customer = await withDbRetry(() => db.customer.findUnique({ where: { email: em } }))
    }

    return NextResponse.json({ customer: customer || null })
  } catch (error) {
    console.error('[API/customers/me GET]', error)
    return NextResponse.json({ error: 'Customer service temporarily unavailable, please retry' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email: tokenEmail, name: tokenName } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(req, 'standard', uid)
    if (limited) return limited

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(customerUpdateSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const { name, email, phone, houseStreet, area, city, state, pincode } = parsed.data

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
    return NextResponse.json({ error: 'Failed to save customer' }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { uid, email } = extractAuthFromRequest(req)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(req, 'standard', uid)
    if (limited) return limited

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    // Whitelist updatable fields — unknown keys (id, role, userId, …) are stripped,
    // closing the previous mass-assignment hole (`data: body`).
    const parsed = validate(customerUpdateSchema, raw.body)
    if (!parsed.ok) return parsed.response

    let customer = await db.customer.findUnique({ where: { id: uid } })
    if (!customer && email) {
      customer = await db.customer.findUnique({ where: { email: email.toLowerCase().trim() } })
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updated = await db.customer.update({
      where: { id: customer.id },
      data: parsed.data,
    })

    return NextResponse.json({ customer: updated })
  } catch (error) {
    console.error('[API/customers/me PATCH]', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 503 })
  }
}
