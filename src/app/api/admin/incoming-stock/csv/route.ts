import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Papa from 'papaparse'

interface CSVRow {
  sku?: string
  product_name?: string
  quantity?: string | number
  purchase_price?: string | number
  supplier?: string
  [key: string]: unknown
}

interface ValidationError {
  row: number
  sku: string
  message: string
}

interface ValidatedRow {
  rowNumber: number
  productId: string
  sku: string
  productName: string
  quantity: number
  purchasePrice: number
  supplierId: string
  supplierCode: string
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let csvText = ''
    let commitBatch = false

    if (contentType.includes('application/json')) {
      const body = await req.json()
      csvText = body.csvText
      commitBatch = body.action === 'commit'
    } else {
      csvText = await req.text()
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'Empty CSV content received' }, { status: 400 })
    }

    // 1. File validation & Schema parsing
    const parsed = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    })

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json({ error: 'Failed to parse CSV file', details: parsed.errors }, { status: 400 })
    }

    const rows = parsed.data

    // 2. Pre-fetch DB products & suppliers for business rule validation
    const products = await db.product.findMany({ select: { id: true, sku: true, name: true } })
    const suppliers = await db.supplier.findMany({ select: { id: true, code: true, name: true } })

    const prodMap = new Map(products.map((p) => [p.sku.toUpperCase(), p]))
    const supMap = new Map()
    suppliers.forEach((s) => {
      supMap.set(s.code.toUpperCase(), s)
      supMap.set(s.name.toUpperCase(), s)
    })

    const errors: ValidationError[] = []
    const validRows: ValidatedRow[] = []
    const seenSkusInBatch = new Set<string>()

    // 3. Row-by-Row Validation & Normalization
    rows.forEach((row, idx) => {
      const rowNum = idx + 1
      const rawSku = (row.sku || row.product_sku || '').toString().trim().toUpperCase()
      const rawQty = parseFloat((row.quantity || row.qty || '0').toString().trim())
      const rawPrice = parseFloat((row.purchase_price || row.price || '0').toString().trim())
      const rawSup = (row.supplier || row.supplier_code || '').toString().trim().toUpperCase()

      // SKU check
      if (!rawSku) {
        errors.push({ row: rowNum, sku: 'N/A', message: 'Missing SKU' })
        return
      }

      const product = prodMap.get(rawSku)
      if (!product) {
        errors.push({ row: rowNum, sku: rawSku, message: `SKU "${rawSku}" does not exist in product catalog` })
        return
      }

      // Quantity check
      if (isNaN(rawQty) || rawQty <= 0) {
        errors.push({ row: rowNum, sku: rawSku, message: `Invalid quantity "${row.quantity}". Must be a number > 0.` })
        return
      }

      // Price check
      if (isNaN(rawPrice) || rawPrice < 0) {
        errors.push({ row: rowNum, sku: rawSku, message: `Invalid purchase price "${row.purchase_price}". Must be a number >= 0.` })
        return
      }

      // Supplier check
      let supplier = supMap.get(rawSup)
      if (!supplier && suppliers.length > 0) {
        supplier = suppliers[0] // Fallback to first supplier if unmapped
      }
      if (!supplier) {
        errors.push({ row: rowNum, sku: rawSku, message: `Supplier "${rawSup}" not found` })
        return
      }

      // Duplicate check within same batch
      if (seenSkusInBatch.has(rawSku)) {
        errors.push({ row: rowNum, sku: rawSku, message: `Duplicate SKU "${rawSku}" in the same CSV file` })
        return
      }
      seenSkusInBatch.add(rawSku)

      validRows.push({
        rowNumber: rowNum,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity: rawQty,
        purchasePrice: rawPrice,
        supplierId: supplier.id,
        supplierCode: supplier.code,
      })
    })

    const summary = {
      rowsReceived: rows.length,
      validRowsCount: validRows.length,
      invalidRowsCount: errors.length,
      errors,
      validRows,
    }

    // 4. Execution / Commit mode
    if (!commitBatch) {
      return NextResponse.json({
        message: 'CSV Validation Complete',
        ...summary,
      })
    }

    // Reject broken batch unless zero errors
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot commit batch with errors. Please fix all row errors before importing.',
          ...summary,
        },
        { status: 422 }
      )
    }

    // 5. Atomic DB Transaction Commit
    const invoiceNumber = `PO-CSV-${Date.now()}`
    const totalAmount = validRows.reduce((sum, r) => sum + r.quantity * r.purchasePrice, 0)
    const primarySupplierId = validRows[0].supplierId

    await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId: primarySupplierId,
          status: 'COMPLETED',
          totalAmount,
          notes: `Batch CSV Stock Ingestion (${validRows.length} items)`,
          purchaseItems: {
            create: validRows.map((r) => ({
              productId: r.productId,
              quantity: r.quantity,
              purchasePrice: r.purchasePrice,
              subtotal: r.quantity * r.purchasePrice,
            })),
          },
        },
      })

      // Update inventory & create transaction records
      for (const item of validRows) {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } })
        const prevQty = inv?.availableQuantity ?? 0
        const newQty = prevQty + item.quantity

        await tx.inventory.upsert({
          where: { productId: item.productId },
          update: { availableQuantity: newQty },
          create: { productId: item.productId, availableQuantity: newQty, reservedQuantity: 0, damagedQuantity: 0 },
        })

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            transactionType: 'PURCHASE',
            quantity: item.quantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            referenceType: 'CSV_IMPORT',
            referenceId: purchase.id,
            createdBy: 'ADMIN',
          },
        })
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          action: 'IMPORT',
          entity: 'INVENTORY',
          entityId: purchase.id,
          details: `Imported ${validRows.length} items from CSV (Invoice: ${invoiceNumber})`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${validRows.length} stock items!`,
      invoiceNumber,
      importedCount: validRows.length,
    })
  } catch (error) {
    console.error('[API/admin/incoming-stock/csv POST]', error)
    return NextResponse.json({ error: 'Failed to process CSV pipeline' }, { status: 500 })
  }
}

