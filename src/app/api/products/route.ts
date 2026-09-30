import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'
import { guardRoles } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate, validateQuery } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { idParamSchema } from '@/lib/validators/common'
import { productCreateSchema, productQuerySchema } from '@/lib/validators/products'

export async function GET(req: NextRequest) {
  try {
    const limited = await checkRateLimit(req, 'standard')
    if (limited) return limited

    const q = validateQuery(productQuerySchema, req)
    if (!q.ok) return q.response
    const { category, search, inStock, featured, limit } = q.data

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
  // Catalog writes require staff — this endpoint was previously unauthenticated.
  const { denied, requester } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  if (!requester) return apiError('Unauthorized: sign-in required', 401)
  try {
    const limited = await checkRateLimit(req, 'standard', requester.uid)
    if (limited) return limited

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(productCreateSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const { id, sku, name, description, categoryId, brand, unit, mrp, sellingPrice, taxRate, imageUrl, supplierId, reorderLevel, safetyStock, leadTimeDays } = parsed.data

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
        mrp,
        sellingPrice,
        taxRate: taxRate ?? 0,
        imageUrl: imageUrl || `/products/${productId}.webp`,
        supplierId,
        reorderLevel: reorderLevel ?? 10,
        safetyStock: safetyStock ?? 5,
        leadTimeDays: leadTimeDays ?? 3,
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
