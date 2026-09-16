import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStockStatus, getDiscountPercent } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
  try {
    const { id } = await params
    const body = await req.json()

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.categoryId && { categoryId: body.categoryId }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.unit && { unit: body.unit }),
        ...(body.mrp !== undefined && { mrp: parseFloat(body.mrp) }),
        ...(body.sellingPrice !== undefined && { sellingPrice: parseFloat(body.sellingPrice) }),
        ...(body.taxRate !== undefined && { taxRate: parseFloat(body.taxRate) }),
        ...(body.imageUrl && { imageUrl: body.imageUrl }),
        ...(body.supplierId !== undefined && { supplierId: body.supplierId }),
        ...(body.reorderLevel !== undefined && { reorderLevel: parseInt(body.reorderLevel) }),
        ...(body.safetyStock !== undefined && { safetyStock: parseInt(body.safetyStock) }),
        ...(body.leadTimeDays !== undefined && { leadTimeDays: parseInt(body.leadTimeDays) }),
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
