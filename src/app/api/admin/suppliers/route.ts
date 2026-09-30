import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guardRoles } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { readJsonBody, validate } from '@/lib/api-response'
import { supplierCreateSchema } from '@/lib/validators/suppliers'

export async function GET() {
  const { denied } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  const limited = await checkRateLimit(null, 'standard')
  if (limited) return limited
  try {
    const suppliers = await db.supplier.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { products: true, purchases: true } },
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            sellingPrice: true,
            unit: true,
            inventory: { select: { availableQuantity: true } },
          },
        },
      },
    })
    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('[API/admin/suppliers GET]', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { denied } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  const limited = await checkRateLimit(req, 'standard')
  if (limited) return limited
  try {
    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(supplierCreateSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const { code, name, contactName, email, phone, address, categories, rating, leadTimeDays } = parsed.data

    const supplier = await db.supplier.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        contactName,
        email,
        phone,
        address,
        categories: categories || 'General FMCG',
        rating: rating ?? 4.8,
        leadTimeDays: leadTimeDays ?? 2,
      },
    })

    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    console.error('[API/admin/suppliers POST]', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
