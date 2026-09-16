import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const inStock = searchParams.get('inStock')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Record<string, unknown> = { isActive: true }
    if (category) {
      where.category = { name: category }
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const products = await db.product.findMany({
      where,
      take: limit,
      orderBy: featured ? { sellingPrice: 'asc' } : { name: 'asc' },
      include: {
        category: true,
        supplier: true,
        inventory: true,
      },
    })

    const transformed = products.map((p) => {
      const avail = p.inventory?.availableQuantity ?? 0
      const res = p.inventory?.reservedQuantity ?? 0
      const dam = p.inventory?.damagedQuantity ?? 0
      const totalStock = avail

      if (inStock === 'true' && totalStock <= 0) return null

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        categoryId: p.categoryId,
        brand: p.brand,
        description: p.description,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        taxRate: p.taxRate,
        imageUrl: p.imageUrl,
        supplier: p.supplier ? { id: p.supplier.id, code: p.supplier.code, name: p.supplier.name } : null,
        stock: totalStock,
        availableQuantity: avail,
        reservedQuantity: res,
        damagedQuantity: dam,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        leadTimeDays: p.leadTimeDays,
        unit: p.unit,
        isActive: p.isActive,
        stockStatus: getStockStatus(totalStock, p.reorderLevel),
        discountPercent: getDiscountPercent(p.mrp, p.sellingPrice),
      }
    }).filter(Boolean)

    return NextResponse.json({ products: transformed })
  } catch (error) {
    console.error('[API/products GET]', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, sku, name, description, categoryId, brand, unit, mrp, sellingPrice, taxRate, imageUrl, supplierId, reorderLevel, safetyStock, leadTimeDays } = body

    if (!name || !sku || !categoryId || mrp === undefined || sellingPrice === undefined) {
      return NextResponse.json({ error: 'Missing required product fields' }, { status: 400 })
    }

    const productId = id || sku

    const product = await db.product.create({
      data: {
        id: productId,
        sku,
        name,
        description,
        categoryId,
        brand,
        unit: unit || '1 pc',
        mrp: parseFloat(mrp),
        sellingPrice: parseFloat(sellingPrice),
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 0,
        imageUrl: imageUrl || `/products/${productId}.webp`,
        supplierId,
        reorderLevel: parseInt(reorderLevel || 10),
        safetyStock: parseInt(safetyStock || 5),
        leadTimeDays: parseInt(leadTimeDays || 3),
        inventory: {
          create: {
            availableQuantity: 0,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        },
      },
      include: { category: true, supplier: true, inventory: true },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('[API/products POST]', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
