import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { generateBillNumber } from '@/lib/utils'
import { extractAuthFromRequest } from '@/lib/auth-util'
import { isPrivilegedRequest, resolveRequester } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { orderCreateSchema } from '@/lib/validators/orders'
import { logger } from '@/lib/logger'
import { publishOrderEvent } from '@/lib/order-events'
import type { CartItem } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const limited = await checkRateLimit(req, 'standard')
    if (limited) return limited
    const { uid, email } = extractAuthFromRequest(req)

    // Admin visibility requires a verified ADMIN/STAFF session — never a
    // query param, bare uid, or email string match.
    const isUserAdmin = await isPrivilegedRequest()

    // Determine customer filter
    let customerFilter: string | undefined = undefined
    if (!isUserAdmin && uid) {
      const cust = await withDbRetry(() =>
        db.customer.findFirst({
          where: {
            OR: [{ id: uid }, ...(email ? [{ email }] : [])],
          },
        })
      )
      customerFilter = cust ? cust.id : uid
    }

    const orders = await withDbRetry(() =>
      db.order.findMany({
        where: isUserAdmin ? {} : customerFilter ? { customerId: customerFilter } : {},
        include: {
          orderItems: true,
          bill: true,
          customer: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    )

    return NextResponse.json({ orders })
  } catch (error) {
    logger.error('orders', 'fetch orders failed', {
      reason: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Order service temporarily unavailable, please retry' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid: tokenUid, email: tokenEmail, name: tokenName } = extractAuthFromRequest(req)

    // Checkout throttle: 10 orders/min per user (falls back to IP when anonymous)
    const limited = await checkRateLimit(req, 'checkout', tokenUid)
    if (limited) return limited

    // Warm the DB (absorbs Neon cold-start P1001) BEFORE the order
    // transaction — never retry the transaction itself (would double-charge).
    try {
      await withDbRetry(() => db.$queryRawUnsafe('SELECT 1'));
    } catch (warmErr) {
      logger.error('orders', 'db unreachable during warmup', {
        reason: warmErr instanceof Error ? warmErr.message : String(warmErr),
      })
      return NextResponse.json(
        { error: 'Database temporarily unavailable, please retry in a few seconds' },
        { status: 503 }
      )
    }

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(orderCreateSchema, raw.body)
    if (!parsed.ok) return parsed.response

    const {
      items: rawItems,
      deliveryAddress: rawDeliveryAddress,
      notes,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
    } = parsed.data

    const items = Array.isArray(rawItems) ? rawItems : []
    const deliveryAddress = typeof rawDeliveryAddress === 'string' ? rawDeliveryAddress.trim() : ''

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }
    if (!deliveryAddress) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 })
    }

    const effectiveUid = (customerId || tokenUid || '').trim()
    // Fall back to the verified server session (sr-session cookie / Bearer)
    // so password-login (ADMIN/STAFF) users can also check out.
    let sessionFallback: { uid: string; email: string; name?: string | null } | null = null
    if (!effectiveUid) {
      try {
        const requester = await resolveRequester()
        if (requester) sessionFallback = { uid: requester.uid, email: requester.email }
      } catch {
        // ignore — handled as unauthorized below
      }
    }
    const resolvedUid = effectiveUid || sessionFallback?.uid?.trim() || ''
    if (!resolvedUid) {
      return NextResponse.json({ error: 'Unauthorized: User sign-in required to place an order' }, { status: 401 })
    }

    // Normalize items by product ID
    const normalizedMap = new Map<string, number>()
    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: 'Each item must have a valid product and quantity' }, { status: 400 })
      }
      normalizedMap.set(item.productId, (normalizedMap.get(item.productId) || 0) + item.quantity)
    }

    const requestedItems = Array.from(normalizedMap, ([productId, quantity]) => {
      const orig = items.find((i) => i.productId === productId)
      return {
        productId,
        quantity,
        name: orig?.name,
        category: orig?.category,
      }
    })

    const effectiveEmail = (
      customerEmail ||
      tokenEmail ||
      sessionFallback?.email ||
      `${resolvedUid}@smartretail.com`
    ).toLowerCase().trim()

    const effectiveName = (customerName || tokenName || 'Store Customer').trim()
    const effectivePhone = (customerPhone || '+91 98765 43210').trim()

    // 1. Resolve Customer safely (check by ID first, then by email)
    let customer = await db.customer.findUnique({ where: { id: resolvedUid } })
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
        ? `${resolvedUid}_${Date.now()}@smartretail.com`
        : effectiveEmail

      customer = await db.customer.create({
        data: {
          id: resolvedUid,
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
    const productIds = requestedItems.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { inventory: true, category: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // 4. Validate stock
    for (const item of requestedItems) {
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

    const orderItemsData = requestedItems.map((item) => {
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
          notes: notes?.trim() || undefined,
          deliveryAddress,
          orderItems: { create: orderItemsData },
        },
        include: { orderItems: true },
      })

      // Reserve stock & record inventory transactions
      for (const item of requestedItems) {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } })
        const prevAvail = inv?.availableQuantity ?? 0
        const prevRes = inv?.reservedQuantity ?? 0
        if (prevAvail < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`)
        }
        const newAvail = prevAvail - item.quantity
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
            details: `Order placed for ₹${total.toFixed(2)} (${requestedItems.length} items)`,
          },
        })
      } catch (auditErr) {
        logger.warn('orders', 'non-critical audit log skipped', {
          orderId: order.id,
          reason: auditErr instanceof Error ? auditErr.message : String(auditErr),
        })
      }

      return { order, bill }
    }, {
      // Neon serverless latency: ~8 sequential writes × cold-start round-trips
      // easily exceed Prisma's 5s default → P2028 "Transaction not found" (500).
      maxWait: 15000,
      timeout: 30000,
    })

    // Notify admin subscribers (best effort — must never fail the order).
    logger.info('orders', 'order created', {
      orderId: result.order.id,
      billNumber: result.bill.billNumber,
      itemCount: requestedItems.length,
      total: result.order.total,
    })
    publishOrderEvent({
      type: 'order.created',
      orderId: result.order.id,
      billNumber: result.bill.billNumber,
      total: result.order.total,
      itemCount: requestedItems.length,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      orderId: result.order.id,
      billNumber: result.bill.billNumber,
      billId: result.bill.id,
    })
  } catch (error) {
    logger.error('orders', 'order creation failed', {
      reason: error instanceof Error ? error.message : String(error),
    })
    const message = error instanceof Error ? error.message : String(error)
    const code = (error as { code?: string })?.code
    const transient =
      code === 'P1001' ||
      code === 'P2028' ||
      message.includes("Can't reach database server") ||
      message.includes('timed out fetching a new connection') ||
      message.includes('Transaction not found') ||
      message.includes('Transaction expired')
    if (transient) {
      return NextResponse.json(
        { error: 'Database waking up, please retry in a few seconds' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: `Failed to create order: ${message}` },
      { status: 500 }
    )
  }
}
