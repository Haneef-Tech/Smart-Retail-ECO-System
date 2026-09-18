import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateBillNumber } from '@/lib/utils'
import { extractAuthFromRequest } from '@/lib/auth-util'
import type { CartItem } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const { uid, email } = extractAuthFromRequest(req)
    const url = new URL(req.url)
    const isAdminParam = url.searchParams.get('admin') === 'true' || url.searchParams.get('all') === 'true'

    // Check if user is admin
    let isUserAdmin =
      isAdminParam ||
      uid === 'admin-uid' ||
      uid === 'admin-uid-haneef123' ||
      email === 'aluruhaneef1@gmail.com'

    if (uid && !isUserAdmin) {
      const customer = await db.customer.findFirst({
        where: {
          OR: [{ id: uid }, ...(email ? [{ email }] : [])],
        },
      })
      isUserAdmin = customer?.email === 'aluruhaneef1@gmail.com'
    }

    // Determine customer filter
    let customerFilter: string | undefined = undefined
    if (!isUserAdmin && uid) {
      const cust = await db.customer.findFirst({
        where: {
          OR: [{ id: uid }, ...(email ? [{ email }] : [])],
        },
      })
      customerFilter = cust ? cust.id : uid
    }

    const orders = await db.order.findMany({
      where: isUserAdmin ? {} : customerFilter ? { customerId: customerFilter } : {},
      include: {
        orderItems: true,
        bill: true,
        customer: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[API/orders GET]', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid: tokenUid, email: tokenEmail, name: tokenName } = extractAuthFromRequest(req)

    const body = await req.json()
    const {
      items,
      deliveryAddress,
      notes,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
    } = body as {
      items: CartItem[]
      deliveryAddress: string
      notes?: string
      customerId?: string
      customerName?: string
      customerPhone?: string
      customerEmail?: string
    }

    const effectiveUid = (customerId || tokenUid || '').trim()
    if (!effectiveUid) {
      return NextResponse.json({ error: 'Unauthorized: User sign-in required to place an order' }, { status: 401 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    const effectiveEmail = (
      customerEmail ||
      tokenEmail ||
      `${effectiveUid}@smartretail.com`
    ).toLowerCase().trim()

    const effectiveName = (customerName || tokenName || 'Store Customer').trim()
    const effectivePhone = (customerPhone || '+91 98765 43210').trim()

    // 1. Resolve Customer safely (check by ID first, then by email)
    let customer = await db.customer.findUnique({ where: { id: effectiveUid } })
    if (!customer && effectiveEmail) {
      customer = await db.customer.findUnique({ where: { email: effectiveEmail } })
    }

    if (customer) {
      // Update existing customer contact info
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          houseStreet: deliveryAddress || customer.houseStreet || 'Mydukur',
          area: customer.area || 'Mydukur',
          city: customer.city || 'Kadapa',
          state: customer.state || 'Andhra Pradesh',
          pincode: customer.pincode || '516172',
          phone: effectivePhone || customer.phone,
          ...(customerName ? { name: effectiveName } : {}),
        },
      })
    } else {
      // Verify email doesn't collide with another record
      const emailConflict = await db.customer.findUnique({ where: { email: effectiveEmail } })
      const safeEmail = emailConflict
        ? `${effectiveUid}_${Date.now()}@smartretail.com`
        : effectiveEmail

      customer = await db.customer.create({
        data: {
          id: effectiveUid,
          name: effectiveName,
          email: safeEmail,
          phone: effectivePhone,
          houseStreet: deliveryAddress || 'Mydukur',
          area: 'Mydukur',
          city: 'Kadapa',
          state: 'Andhra Pradesh',
          pincode: '516172',
        },
      })
    }

    const actualCustomerId = customer.id

    // Check if user has corresponding internal User record for foreign keys
    const existingUser = await db.user.findUnique({ where: { id: actualCustomerId } })
    const validUserId = existingUser ? actualCustomerId : null

    // 2. Fetch GST rates
    const gstRates = await db.gstRate.findMany()
    const gstMap: Record<string, number> = {}
    for (const g of gstRates) gstMap[g.category] = g.rate

    // 3. Fetch products & inventory records
    const productIds = items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { inventory: true, category: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // 4. Validate stock
    for (const item of items) {
      const p = productMap.get(item.productId)
      if (!p) {
        return NextResponse.json({ error: `Product "${item.name || item.productId}" not found` }, { status: 400 })
      }

      const avail = p.inventory?.availableQuantity ?? 0
      if (avail < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${p.name}". Available: ${avail}, Requested: ${item.quantity}`,
          },
          { status: 400 }
        )
      }
    }

    // 5. Calculate Order Totals
    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0

    const orderItemsData = items.map((item) => {
      const p = productMap.get(item.productId)!
      const gstRate = p.category?.taxRate ?? gstMap[p.category?.name || ''] ?? 0
      const itemSubtotal = p.sellingPrice * item.quantity
      const itemDiscount = (p.mrp - p.sellingPrice) * item.quantity
      const gstAmount = itemSubtotal * gstRate

      subtotal += itemSubtotal
      totalDiscount += itemDiscount
      totalTax += gstAmount

      return {
        productId: p.id,
        productName: p.name,
        category: p.category?.name || item.category || 'Grocery',
        quantity: item.quantity,
        unitPrice: p.sellingPrice,
        mrp: p.mrp,
        discount: itemDiscount,
        gstRate,
        gstAmount,
      }
    })

    const total = subtotal + totalTax
    const billNumber = generateBillNumber()

    // 6. Execute Atomic Order Transaction
    const result = await db.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          customerId: actualCustomerId,
          status: 'CONFIRMED',
          subtotal,
          totalDiscount,
          totalTax,
          total,
          notes,
          deliveryAddress,
          orderItems: { create: orderItemsData },
        },
        include: { orderItems: true },
      })

      // Reserve stock & record inventory transactions
      for (const item of items) {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } })
        const prevAvail = inv?.availableQuantity ?? 0
        const prevRes = inv?.reservedQuantity ?? 0
        const newAvail = Math.max(0, prevAvail - item.quantity)
        const newRes = prevRes + item.quantity

        await tx.inventory.upsert({
          where: { productId: item.productId },
          update: {
            availableQuantity: newAvail,
            reservedQuantity: newRes,
          },
          create: {
            productId: item.productId,
            availableQuantity: 0,
            reservedQuantity: item.quantity,
            damagedQuantity: 0,
          },
        })

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            transactionType: 'RESERVATION',
            quantity: -item.quantity,
            previousQuantity: prevAvail,
            newQuantity: newAvail,
            referenceType: 'ORDER',
            referenceId: order.id,
            createdBy: validUserId,
          },
        })
      }

      // Generate Bill
      const bill = await tx.bill.create({
        data: {
          billNumber,
          orderId: order.id,
          paymentStatus: 'PAID',
        },
      })

      // Create Sale record
      await tx.sale.create({
        data: {
          orderId: order.id,
          customerId: actualCustomerId,
          totalAmount: total,
          taxAmount: totalTax,
          paymentMode: 'ONLINE',
          saleItems: {
            create: orderItemsData.map((oi) => ({
              productId: oi.productId,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
              taxAmount: oi.gstAmount,
              total: oi.unitPrice * oi.quantity + oi.gstAmount,
            })),
          },
        },
      })

      // Audit log (best effort, do not abort order if audit table fails)
      try {
        await tx.auditLog.create({
          data: {
            userId: validUserId,
            userEmail: effectiveEmail,
            action: 'CREATE',
            entity: 'ORDER',
            entityId: order.id,
            details: `Order placed for ₹${total.toFixed(2)} (${items.length} items)`,
          },
        })
      } catch (auditErr) {
        console.warn('[API/orders] Non-critical audit log skipped:', auditErr)
      }

      return { order, bill }
    })

    return NextResponse.json({
      success: true,
      orderId: result.order.id,
      billNumber: result.bill.billNumber,
      billId: result.bill.id,
    })
  } catch (error) {
    console.error('[API/orders POST error]', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to create order: ${message}` },
      { status: 500 }
    )
  }
}
