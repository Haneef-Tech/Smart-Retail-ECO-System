import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const records = await db.storeSaleRecord.findMany({
      orderBy: { date: 'desc' },
      take: 200,
    })

    const totalCount = await db.storeSaleRecord.count()
    const totalRevenue = records.reduce((sum, r) => sum + r.totalRevenue, 0)
    const totalUnitsSold = records.reduce((sum, r) => sum + r.quantity, 0)

    // Compute Product Leaderboard
    const productMap: Record<string, { name: string; category: string; units: number; revenue: number }> = {}
    const categoryMap: Record<string, number> = {}

    for (const r of records) {
      if (!productMap[r.productName]) {
        productMap[r.productName] = {
          name: r.productName,
          category: r.category || 'General',
          units: 0,
          revenue: 0,
        }
      }
      productMap[r.productName].units += r.quantity
      productMap[r.productName].revenue += r.totalRevenue

      const cat = r.category || 'General'
      categoryMap[cat] = (categoryMap[cat] || 0) + r.totalRevenue
    }

    const topProducts = Object.values(productMap).sort((a, b) => b.units - a.units).slice(0, 10)
    const ragDocsCount = await db.knowledgeDocument.count({
      where: { category: 'STORE_SALES' },
    })

    return NextResponse.json({
      records,
      totalCount,
      totalRevenue,
      totalUnitsSold,
      topProducts,
      categoryBreakdown: categoryMap,
      ragDocsCount,
    })
  } catch (error) {
    console.error('[API/admin/sales/upload GET]', error)
    return NextResponse.json({ error: 'Failed to fetch sales records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { rawCsv, records: incomingRecords } = body

    let rowsToInsert: Array<{
      date: string
      sku: string
      productName: string
      category: string
      quantity: number
      unitPrice: number
      totalRevenue: number
      paymentMode: string
    }> = []

    if (Array.isArray(incomingRecords) && incomingRecords.length > 0) {
      rowsToInsert = incomingRecords.map((r) => {
        const qty = parseInt(r.quantity || r.qty || '1') || 1
        const price = parseFloat(r.unitPrice || r.sellingPrice || r.price || '0') || 0
        const revenue = parseFloat(r.totalRevenue || r.revenue || '0') || qty * price
        return {
          date: String(r.date || new Date().toISOString().slice(0, 10)),
          sku: String(r.sku || ''),
          productName: String(r.productName || r.name || 'Store Item').trim(),
          category: String(r.category || 'General').trim(),
          quantity: qty,
          unitPrice: price,
          totalRevenue: revenue,
          paymentMode: String(r.paymentMode || r.payment || 'UPI').trim(),
        }
      })
    } else if (rawCsv && typeof rawCsv === 'string') {
      const lines = rawCsv.trim().split(/\r?\n/)
      if (lines.length < 2) {
        return NextResponse.json({ error: 'CSV must contain at least a header and 1 data row' }, { status: 400 })
      }

      const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const dateIdx = header.findIndex((h) => h.includes('date'))
      const nameIdx = header.findIndex((h) => h.includes('product') || h.includes('item') || h.includes('name'))
      const skuIdx = header.findIndex((h) => h.includes('sku') || h.includes('code'))
      const catIdx = header.findIndex((h) => h.includes('cat'))
      const qtyIdx = header.findIndex((h) => h.includes('qty') || h.includes('quant') || h.includes('unit'))
      const priceIdx = header.findIndex((h) => h.includes('price') || h.includes('rate'))
      const revIdx = header.findIndex((h) => h.includes('rev') || h.includes('total') || h.includes('amount'))
      const payIdx = header.findIndex((h) => h.includes('pay') || h.includes('mode'))

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))

        const prodName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : `Product ${i}`
        const qty = qtyIdx !== -1 && !isNaN(parseInt(cols[qtyIdx])) ? parseInt(cols[qtyIdx]) : 1
        const price = priceIdx !== -1 && !isNaN(parseFloat(cols[priceIdx])) ? parseFloat(cols[priceIdx]) : 100
        const revenue = revIdx !== -1 && !isNaN(parseFloat(cols[revIdx])) ? parseFloat(cols[revIdx]) : qty * price
        const date = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10)
        const sku = skuIdx !== -1 && cols[skuIdx] ? cols[skuIdx] : ''
        const category = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : 'General'
        const paymentMode = payIdx !== -1 && cols[payIdx] ? cols[payIdx] : 'UPI'

        rowsToInsert.push({
          date,
          sku,
          productName: prodName,
          category,
          quantity: qty,
          unitPrice: price,
          totalRevenue: revenue,
          paymentMode,
        })
      }
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: 'No valid sales records parsed from input' }, { status: 400 })
    }

    // 1. Insert records into StoreSaleRecord
    await db.storeSaleRecord.createMany({
      data: rowsToInsert,
    })

    // 2. Train RAG Knowledge System on this uploaded store sales data
    const allSales = await db.storeSaleRecord.findMany({ orderBy: { date: 'asc' } })
    const totalRevenue = allSales.reduce((s, r) => s + r.totalRevenue, 0)
    const totalUnits = allSales.reduce((s, r) => s + r.quantity, 0)

    // Aggregate Product metrics
    const productStats: Record<string, { units: number; revenue: number; category: string }> = {}
    const categoryStats: Record<string, { units: number; revenue: number }> = {}
    const dateStats: Record<string, { orders: number; revenue: number; units: number }> = {}

    for (const s of allSales) {
      if (!productStats[s.productName]) {
        productStats[s.productName] = { units: 0, revenue: 0, category: s.category || 'General' }
      }
      productStats[s.productName].units += s.quantity
      productStats[s.productName].revenue += s.totalRevenue

      const cat = s.category || 'General'
      if (!categoryStats[cat]) categoryStats[cat] = { units: 0, revenue: 0 }
      categoryStats[cat].units += s.quantity
      categoryStats[cat].revenue += s.totalRevenue

      if (!dateStats[s.date]) dateStats[s.date] = { orders: 0, revenue: 0, units: 0 }
      dateStats[s.date].orders += 1
      dateStats[s.date].revenue += s.totalRevenue
      dateStats[s.date].units += s.quantity
    }

    const topByUnits = Object.entries(productStats)
      .sort((a, b) => b[1].units - a[1].units)
      .slice(0, 10)

    const topByRevenue = Object.entries(productStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)

    // Create / Update Structured RAG Documents
    const ragDocs = [
      {
        title: 'Uploaded Store Sales Fact Sheet — Core Overview',
        category: 'STORE_SALES',
        documentType: 'SALES',
        content: `Store Sales Summary:\n• Total Uploaded Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n• Total Units Sold: ${totalUnits.toLocaleString('en-IN')} units\n• Total Transactions: ${allSales.length} records\n• Average Revenue Per Transaction: ₹${Math.round(totalRevenue / (allSales.length || 1))}\n• Top Selling Product by Units: ${topByUnits[0]?.[0] || 'N/A'} (${topByUnits[0]?.[1]?.units || 0} units sold)\n• Top Revenue Product: ${topByRevenue[0]?.[0] || 'N/A'} (₹${(topByRevenue[0]?.[1]?.revenue || 0).toLocaleString('en-IN')})`,
      },
      {
        title: 'Uploaded Store Sales — Product Units & Sales Rankings',
        category: 'STORE_SALES',
        documentType: 'SALES',
        content: `Detailed Product Sales Rankings:\n${topByUnits
          .map(
            ([name, stat], idx) =>
              `${idx + 1}. ${name} (${stat.category}): ${stat.units} units sold, Revenue: ₹${stat.revenue.toLocaleString('en-IN')}`
          )
          .join('\n')}`,
      },
      {
        title: 'Uploaded Store Sales — Category Revenue Breakdown',
        category: 'STORE_SALES',
        documentType: 'SALES',
        content: `Category Revenue Analysis:\n${Object.entries(categoryStats)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .map(
            ([cat, stat]) =>
              `• ${cat}: ₹${stat.revenue.toLocaleString('en-IN')} (${stat.units} units sold, ${Math.round((stat.revenue / (totalRevenue || 1)) * 100)}% of store sales)`
          )
          .join('\n')}`,
      },
      {
        title: 'Uploaded Store Sales — Daily Sales History & Timeline',
        category: 'STORE_SALES',
        documentType: 'SALES',
        content: `Daily Sales Timeline:\n${Object.entries(dateStats)
          .map(
            ([d, stat]) =>
              `• ${d}: ${stat.orders} transactions, ${stat.units} units, ₹${stat.revenue.toLocaleString('en-IN')} revenue`
          )
          .join('\n')}`,
      },
    ]

    // Clear old STORE_SALES RAG documents and insert fresh ones
    await db.knowledgeDocument.deleteMany({ where: { category: 'STORE_SALES' } })
    for (const doc of ragDocs) {
      await db.knowledgeDocument.create({
        data: {
          title: doc.title,
          category: doc.category,
          documentType: doc.documentType,
          content: doc.content,
          source: 'STORE_SALES_UPLOAD',
        },
      })
    }

    return NextResponse.json({
      success: true,
      insertedCount: rowsToInsert.length,
      totalStoreSalesCount: allSales.length,
      totalRevenue,
      totalUnits,
      ragTrainedDocs: ragDocs.length,
      message: `Successfully uploaded ${rowsToInsert.length} sales records! RAG system trained with ${ragDocs.length} knowledge documents.`,
    })
  } catch (error) {
    console.error('[API/admin/sales/upload POST]', error)
    return NextResponse.json(
      { error: 'Failed to upload and train sales: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const delCount = await db.storeSaleRecord.deleteMany()
    await db.knowledgeDocument.deleteMany({ where: { category: 'STORE_SALES' } })

    return NextResponse.json({
      success: true,
      deletedCount: delCount.count,
      message: 'All uploaded store sales data and associated RAG knowledge documents cleared.',
    })
  } catch (error) {
    console.error('[API/admin/sales/upload DELETE]', error)
    return NextResponse.json({ error: 'Failed to clear sales records' }, { status: 500 })
  }
}

