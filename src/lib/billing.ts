/**
 * Pure GST / bill-total helpers.
 *
 * Formulas mirror `src/app/api/orders/route.ts` (order-totals block) and the
 * identical client-side math in `src/app/(store)/checkout/page.tsx` and
 * `src/app/(store)/cart/page.tsx`:
 *   itemSubtotal = sellingPrice * quantity
 *   itemDiscount = (mrp - sellingPrice) * quantity
 *   gstAmount    = itemSubtotal * gstRate
 *   total        = subtotal + totalTax
 *
 * No app code was changed to create this file; it exists so the math can be
 * unit-tested with hand-calculated datasets.
 */

export interface BillLineInput {
  sellingPrice: number
  mrp: number
  quantity: number
  /** GST rate as a fraction, e.g. 0.05 for 5%. */
  gstRate: number
}

export interface BillLineResult {
  itemSubtotal: number
  itemDiscount: number
  gstAmount: number
}

export interface BillTotals {
  subtotal: number
  totalDiscount: number
  totalTax: number
  total: number
}

/** Round to 2 decimal places (paise), same style as engine metric rounding. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Per-line-item GST calculation (unrounded raw values, as stored in DB). */
export function calculateLineGst(line: BillLineInput): BillLineResult {
  const itemSubtotal = line.sellingPrice * line.quantity
  const itemDiscount = (line.mrp - line.sellingPrice) * line.quantity
  const gstAmount = itemSubtotal * line.gstRate
  return { itemSubtotal, itemDiscount, gstAmount }
}

/** Per-bill totals across line items (unrounded raw values, as stored in DB). */
export function calculateBillTotals(lines: BillLineInput[]): BillTotals {
  let subtotal = 0
  let totalDiscount = 0
  let totalTax = 0
  for (const line of lines) {
    const r = calculateLineGst(line)
    subtotal += r.itemSubtotal
    totalDiscount += r.itemDiscount
    totalTax += r.gstAmount
  }
  return { subtotal, totalDiscount, totalTax, total: subtotal + totalTax }
}

/** Per-bill totals rounded to paise for display / reconciliation. */
export function calculateBillTotalsRounded(lines: BillLineInput[]): BillTotals {
  const raw = calculateBillTotals(lines)
  return {
    subtotal: round2(raw.subtotal),
    totalDiscount: round2(raw.totalDiscount),
    totalTax: round2(raw.totalTax),
    total: round2(raw.total),
  }
}
