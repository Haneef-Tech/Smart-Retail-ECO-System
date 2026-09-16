import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateBillNumber } from '@/lib/utils'
import type { CartItem } from '@/types'
import { adminAuth } from '@/lib/firebase-admin'

interface AuthenticatedUser {
  uid: string
  email?: string
  name?: string
}

async function getUserFromRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice(7).trim()
  if (!token) return null

  // The client sends a Firebase ID token, not the Firebase UID. Verify it and
  // use the decoded UID so orders are linked to the actual customer record.
  if (process.env.FIREBASE_ADMIN_PROJECT_ID && adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      return { uid: decoded.uid, email: decoded.email, name: decoded.name }
    } catch {
      return null
    }
  }

  // Keep the local admin fallback usable when Firebase Admin credentials are
  // intentionally absent in development.
  if (token === 'admin-token-haneef123') {
    return { uid: 'admin-uid-haneef123', email: 'aluruhaneef1@gmail.com', name: 'Admin' }
  }

  return null
}

export async function GET(req: NextRequest) {
  try {
      const authenticatedUser = await getUserFromRequest(req)
      const uid = authenticatedUser?.uid ?? null
      const url = new URL(req.url)
      const isAdminParam = url.searchParams.get('admin') === 'true' || url.searchParams.get('all') === 'true'

      // Check if user is admin
      let isUserAdmin = isAdminParam || uid === 'admin-uid-haneef123'
      if (uid && !isUserAdmin) {
        const customer = await db.customer.findUnique({ where: { id: uid } })

      isUserAdmin = customer?.email === 'aluruhaneef1@gmail.com'
    }

    const orders = await db.order.findMany({
      where: isUserAdmin ? {} : uid ? { customerId: uid } : {},
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
    const authenticatedUser = await getUserFromRequest(req)
    if (!authenticatedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = authenticatedUser.uid
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid order request body' }, { status: 400 })
    }

    const payload = body as { items?: CartItem[]; deliveryAddress?: string; notes?: string }
    const items = Array.isArray(payload.items) ? payload.items : []
    const deliveryAddress = typeof payload.deliveryAddress === 'string' ? payload.deliveryAddress.trim() : ''
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() : undefined

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }
    if (!deliveryAddress) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 })
    }

    const normalizedItems = new Map<string, number>()
    for (const item of requestedItems) {
      if (!item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: 'Each item must have a valid product and quantity' }, { status: 400 })
      }
      normalizedItems.set(item.productId, (normalizedItems.get(item.productId) || 0) + item.quantity)
    }
    const requestedItems = Array.from(normalizedItems, ([productId, quantity]) => ({ productId, quantity }))
    const targetUid = uid.trim()

    if (!targetUid) return NextResponse.json({ error: 'Invalid authenticated user' }, { status: 401 })

    // Fetch user record if present in User table
    const existingUser = await db.user.findUnique({ where: { id: targetUid } })
    const validUserId = existingUser ? targetUid : null
    const requestedEmail = authenticatedUser.email || existingUser?.email || `${targetUid}@smartretail.com`
    const emailOwner = await db.customer.findUnique({ where: { email: requestedEmail } })
    const userEmail = emailOwner && emailOwner.id !== targetUid ? `${targetUid}@smartretail.com` : requestedEmail

    // Ensure Customer DB record exists (prevents foreign key constraint errors)
    await db.customer.upsert({
      where: { id: targetUid },
      update: {
        houseStreet: deliveryAddress || 'Mydukur',
        area: 'Mydukur',
        city: 'Kadapa',
        state: 'Andhra Pradesh',
        pincode: '516172',
      },
      create: {
        id: targetUid,
        name: 'Store Customer',
        email: userEmail,
        phone: '+91 98765 43210',
        houseStreet: deliveryAddress || 'Mydukur',
        area: 'Mydukur',
        city: 'Kadapa',
        state: 'Andhra Pradesh',
        pincode: '516172',
      },
    })

    // Fetch GST rates & categories
    const gstRates = await db.gstRate.findMany()
    const gstMap: Record<string, number> = {}
    for (const g of gstRates) gstMap[g.category] = g.rate

    // Fetch products & inventories to verify stock
    const productIds = requestedItems.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { inventory: true, category: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Validate available stock
    for (const item of requestedItems) {
      const p = productMap.get(item.productId)
      if (!p) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 400 })

      const avail = p.inventory?.availableQuantity ?? 0
      if (avail < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${p.name}. Available: ${avail}, Requested: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // Calculate totals
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
        category: p.category?.name || item.category,
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

    // Atomic transaction: Create Order + Bill + Reserve Inventory + Sales Record
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: targetUid,
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

      // Reserve Inventory & Record Inventory Transactions
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
          customerId: targetUid,
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

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: validUserId,
          userEmail: userEmail,
          action: 'CREATE',
          entity: 'ORDER',
          entityId: order.id,
          details: `Order placed for ₹${total.toFixed(2)} (${requestedItems.length} items)`,
        },
      })

      return { order, bill }
    })

    return NextResponse.json({
      orderId: result.order.id,
      billNumber: result.bill.billNumber,
      billId: result.bill.id,
    })
  } catch (error) {
    console.error('[API/orders POST]', error)
    return NextResponse.json(
      { error: 'Failed to create order: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
