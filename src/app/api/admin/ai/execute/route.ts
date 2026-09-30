import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { guardRoles, type Requester } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { executeSchema } from '@/lib/validators/ai'
import { logger } from '@/lib/logger'

/* ---------- AI write-action safety policy ---------- */

// Strict whitelist: the agent may ONLY propose these actions. Anything else is rejected.
const ALLOWED_ACTIONS = ['create_purchase_order', 'update_reorder_point'] as const
type AllowedAction = (typeof ALLOWED_ACTIONS)[number]

// Per-request / per-action limits
const MAX_ACTIONS_PER_REQUEST = 1
const MAX_QUANTITY_PER_ACTION = 500
const MAX_VALUE_PER_ACTION = 100000 // ₹ per action
const MAX_REORDER_LEVEL = 10000
const CONFIRM_TTL_MS = 10 * 60 * 1000 // confirm tokens expire after 10 minutes

interface PendingProposal {
  action: AllowedAction
  params: Record<string, unknown>
  summary: string
  requestedByUid: string
  requestedByEmail: string
  expiresAt: number
}

// Single-use confirm tokens (in-memory; note: not shared across instances)
const pendingProposals = new Map<string, PendingProposal>()

function pruneExpired() {
  const now = Date.now()
  for (const [token, p] of pendingProposals) {
    if (p.expiresAt <= now) pendingProposals.delete(token)
  }
}

async function writeAudit(
  requester: Requester,
  action: AllowedAction,
  params: Record<string, unknown>,
  result: string,
  entity: string,
  entityId?: string
) {
  await db.auditLog.create({
    data: {
      userId: requester.uid,
      userEmail: requester.email,
      action: `AI_EXECUTE:${action}`,
      entity,
      entityId,
      details: JSON.stringify({
        requestedBy: requester.email,
        payload: params,
        result,
        executedAt: new Date().toISOString(),
      }),
    },
  })
}

async function resolvePoTarget(targetId: string) {
  // Accept a Product ID directly…
  const product = await db.product.findUnique({
    where: { id: targetId },
    include: { supplier: true, inventory: true },
  })
  if (product) {
    return { product, reason: 'AI Reorder Recommendation', recommendationQty: null as number | null }
  }
  // …or an AiRecommendation record
  const rec = await db.aiRecommendation.findUnique({
    where: { id: targetId },
    include: { product: { include: { supplier: true, inventory: true } } },
  })
  if (rec) {
    return { product: rec.product, reason: rec.reason, recommendationQty: rec.suggestedQty }
  }
  return null
}

export async function POST(req: NextRequest) {
  // Writes via the AI agent require ADMIN role (401 logged-out, 403 wrong role)
  const { denied, requester } = await guardRoles(['ADMIN'])
  if (denied) return denied
  if (!requester) return NextResponse.json({ error: 'Unauthorized: sign-in required' }, { status: 401 })

  try {
    const limited = await checkRateLimit(req, 'aiExecute', requester.uid)
    if (limited) return limited

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const shape = validate(executeSchema, raw.body)
    if (!shape.ok) return shape.response
    const input = shape.data as Record<string, unknown>

    // Log action names only — never params, tokens, or request bodies.
    logger.info('ai-execute', 'request received', {
      action: typeof input.action === 'string' ? input.action : undefined,
      confirming: typeof input.confirmToken === 'string' && input.confirmToken.length > 0,
    })

    // Enforce max actions per request
    if (Array.isArray(input.actions) && input.actions.length > MAX_ACTIONS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Max ${MAX_ACTIONS_PER_REQUEST} action(s) per request` },
        { status: 400 }
      )
    }

    /* ----- Step 2: confirm a previously proposed action (single-use token) ----- */
    if (typeof input.confirmToken === 'string' && input.confirmToken) {
      pruneExpired()
      const pending = pendingProposals.get(input.confirmToken)
      if (!pending) {
        return NextResponse.json(
          { error: 'Invalid or expired confirmation token. Propose the action again.' },
          { status: 400 }
        )
      }
      if (pending.requestedByUid !== requester.uid) {
        return NextResponse.json(
          { error: 'Confirmation token was issued to a different session' },
          { status: 403 }
        )
      }
      pendingProposals.delete(input.confirmToken)

      if (pending.action === 'create_purchase_order') {
        const { productId, quantity, purchasePrice, supplierId, reason } = pending.params as {
          productId: string
          quantity: number
          purchasePrice: number
          supplierId: string
          reason: string
        }
        if (quantity > MAX_QUANTITY_PER_ACTION || quantity * purchasePrice > MAX_VALUE_PER_ACTION) {
          return NextResponse.json({ error: 'Action exceeds per-action limits' }, { status: 400 })
        }
        const product = await db.product.findUnique({ where: { id: productId } })
        if (!product) return NextResponse.json({ error: 'Product no longer exists' }, { status: 404 })

        const invoiceNumber = `PO-AI-${Date.now().toString().slice(-6)}`
        const purchase = await db.purchase.create({
          data: {
            invoiceNumber,
            supplierId,
            status: 'PENDING',
            totalAmount: quantity * purchasePrice,
            notes: `AI Recommended Purchase Order — ${reason} (confirmed by ${requester.email})`,
            purchaseItems: {
              create: [{ productId, quantity, purchasePrice, subtotal: quantity * purchasePrice }],
            },
          },
          include: { supplier: true },
        })

        const result = `Created Purchase Order ${invoiceNumber} for ${quantity} units of ${product.name} from ${purchase.supplier?.name}`
        await writeAudit(requester, pending.action, pending.params, result, 'PURCHASE', purchase.id)
        logger.info('ai-execute', 'action executed', {
          action: pending.action,
          entityId: purchase.id,
          quantity,
        })
        return NextResponse.json({
          success: true,
          message: `${result}! Check Supplier Delivery Status.`,
          purchase,
        })
      }

      if (pending.action === 'update_reorder_point') {
        const { productId, reorderLevel } = pending.params as {
          productId: string
          reorderLevel: number
        }
        const product = await db.product.findUnique({ where: { id: productId } })
        if (!product) return NextResponse.json({ error: 'Product no longer exists' }, { status: 404 })

        const updated = await db.product.update({
          where: { id: productId },
          data: { reorderLevel },
        })
        const result = `Updated reorder point for ${updated.name}: ${product.reorderLevel} → ${reorderLevel}`
        await writeAudit(requester, pending.action, pending.params, result, 'PRODUCT', updated.id)
        logger.info('ai-execute', 'action executed', {
          action: pending.action,
          entityId: updated.id,
          reorderLevel,
        })
        return NextResponse.json({ success: true, message: result, product: updated })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    /* ----- Step 1: validate + return a proposed action (no writes yet) ----- */
    const rawAction = typeof input.action === 'string' ? input.action : 'create_purchase_order'
    if (!ALLOWED_ACTIONS.includes(rawAction as AllowedAction)) {
      return NextResponse.json(
        { error: `Action not allowed. Permitted: ${ALLOWED_ACTIONS.join(', ')}` },
        { status: 400 }
      )
    }
    const action = rawAction as AllowedAction

    if (action === 'create_purchase_order') {
      // Back-compat: legacy callers send { recommendationId | productId, quantity }
      const targetId =
        (typeof input.productId === 'string' && input.productId) ||
        (typeof input.recommendationId === 'string' && input.recommendationId) ||
        ''
      if (!targetId) {
        return NextResponse.json({ error: 'Target ID required' }, { status: 400 })
      }
      const resolved = await resolvePoTarget(targetId)
      if (!resolved) {
        return NextResponse.json({ error: 'Product or Recommendation not found' }, { status: 404 })
      }
      const { product, reason, recommendationQty } = resolved

      const qty =
        Number.isInteger(input.quantity) && (input.quantity as number) > 0
          ? (input.quantity as number)
          : recommendationQty ?? 20
      if (qty > MAX_QUANTITY_PER_ACTION) {
        return NextResponse.json(
          { error: `Quantity exceeds per-action limit of ${MAX_QUANTITY_PER_ACTION}` },
          { status: 400 }
        )
      }
      const supplierId = product.supplierId || (await db.supplier.findFirst())?.id
      if (!supplierId) {
        return NextResponse.json({ error: 'No supplier mapped for product' }, { status: 400 })
      }
      const purchasePrice = Math.round(product.sellingPrice * 0.75)
      if (qty * purchasePrice > MAX_VALUE_PER_ACTION) {
        return NextResponse.json(
          { error: `Order value exceeds per-action limit of ₹${MAX_VALUE_PER_ACTION.toLocaleString('en-IN')}` },
          { status: 400 }
        )
      }

      const params = { productId: product.id, quantity: qty, purchasePrice, supplierId, reason }
      const summary =
        `Create Purchase Order: ${qty} units of ${product.name} ` +
        `(@ ₹${purchasePrice}, total ₹${(qty * purchasePrice).toLocaleString('en-IN')})`
      const confirmToken = randomUUID().replace(/-/g, '')
      pendingProposals.set(confirmToken, {
        action,
        params,
        summary,
        requestedByUid: requester.uid,
        requestedByEmail: requester.email,
        expiresAt: Date.now() + CONFIRM_TTL_MS,
      })

      return NextResponse.json({
        requiresConfirmation: true,
        proposal: { action, ...params, productName: product.name, estimatedTotal: qty * purchasePrice },
        confirmToken,
        message: `Proposed action (no changes made): ${summary}. Send confirmToken back within 10 minutes to execute.`,
      })
    }

    if (action === 'update_reorder_point') {
      const productId = typeof input.productId === 'string' ? input.productId : ''
      const reorderLevel = input.reorderLevel
      if (!productId || !Number.isInteger(reorderLevel) || (reorderLevel as number) < 0 || (reorderLevel as number) > MAX_REORDER_LEVEL) {
        return NextResponse.json(
          { error: `productId and an integer reorderLevel (0–${MAX_REORDER_LEVEL}) are required` },
          { status: 400 }
        )
      }
      const product = await db.product.findUnique({ where: { id: productId } })
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

      const params = { productId, reorderLevel: reorderLevel as number }
      const summary = `Update reorder point for ${product.name}: ${product.reorderLevel} → ${reorderLevel}`
      const confirmToken = randomUUID().replace(/-/g, '')
      pendingProposals.set(confirmToken, {
        action,
        params,
        summary,
        requestedByUid: requester.uid,
        requestedByEmail: requester.email,
        expiresAt: Date.now() + CONFIRM_TTL_MS,
      })

      return NextResponse.json({
        requiresConfirmation: true,
        proposal: { action, ...params, productName: product.name, previousReorderLevel: product.reorderLevel },
        confirmToken,
        message: `Proposed action (no changes made): ${summary}. Send confirmToken back within 10 minutes to execute.`,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    logger.error('ai-execute', 'request failed', {
      reason: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to execute recommendation' }, { status: 500 })
  }
}
