import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
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
  try {
    const body = await req.json()
    const { code, name, contactName, email, phone, address, categories, rating, leadTimeDays } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Supplier code and name are required' }, { status: 400 })
    }

    const supplier = await db.supplier.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        contactName,
        email,
        phone,
        address,
        categories: categories || 'General FMCG',
        rating: rating ? parseFloat(rating) : 4.8,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : 2,
      },
    })

    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    console.error('[API/admin/suppliers POST]', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
