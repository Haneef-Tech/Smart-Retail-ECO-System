import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'
import { guardRoles } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { idParamSchema } from '@/lib/validators/common'
import { productUpdateSchema } from '@/lib/validators/products'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params
    const idCheck = validate(idParamSchema, { id: rawId })
    if (!idCheck.ok) return idCheck.response
    const { id } = idCheck.data
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true, supplier: true, inventory: true },
    })

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const avail = product.inventory?.availableQuantity ?? 0
    const res = product.inventory?.reservedQuantity ?? 0
    const dam = product.inventory?.damagedQuantity ?? 0

    return NextResponse.json({
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category.name,
        categoryId: product.categoryId,
        brand: product.brand,
        description: product.description,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        taxRate: product.taxRate,
        imageUrl: product.imageUrl,
        supplier: product.supplier ? { id: product.supplier.id, code: product.supplier.code, name: product.supplier.name } : null,
        supplierId: product.supplierId,
        stock: avail,
        availableQuantity: avail,
        reservedQuantity: res,
        damagedQuantity: dam,
        reorderLevel: product.reorderLevel,
        safetyStock: product.safetyStock,
        leadTimeDays: product.leadTimeDays,
        unit: product.unit,
        isActive: product.isActive,
        stockStatus: getStockStatus(avail, product.reorderLevel),
        discountPercent: getDiscountPercent(product.mrp, product.sellingPrice),
      },
    })
  } catch (error) {
    console.error('[API/products/[id] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Catalog writes require staff — this endpoint was previously unauthenticated.
  const { denied, requester } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  if (!requester) return apiError('Unauthorized: sign-in required', 401)
  const limited = await checkRateLimit(req, 'standard', requester.uid)
  if (limited) return limited
  try {
    const { id: rawId } = await params
    const idCheck = validate(idParamSchema, { id: rawId })
    if (!idCheck.ok) return idCheck.response
    const { id } = idCheck.data

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(productUpdateSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.categoryId && { categoryId: body.categoryId }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.unit && { unit: body.unit }),
        ...(body.mrp !== undefined && { mrp: body.mrp }),
        ...(body.sellingPrice !== undefined && { sellingPrice: body.sellingPrice }),
        ...(body.taxRate !== undefined && { taxRate: body.taxRate }),
        ...(body.imageUrl && { imageUrl: body.imageUrl }),
        ...(body.supplierId !== undefined && { supplierId: body.supplierId }),
        ...(body.reorderLevel !== undefined && { reorderLevel: body.reorderLevel }),
        ...(body.safetyStock !== undefined && { safetyStock: body.safetyStock }),
        ...(body.leadTimeDays !== undefined && { leadTimeDays: body.leadTimeDays }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      },
      include: { category: true, supplier: true, inventory: true },
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('[API/products/[id] PATCH]', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}
