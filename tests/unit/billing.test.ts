import { describe, expect, it } from 'vitest'
import {
  calculateBillTotals,
  calculateBillTotalsRounded,
  calculateLineGst,
  round2,
} from '@/lib/billing'

describe('calculateLineGst (per line item)', () => {
  it('computes subtotal, discount and GST for a standard line', () => {
    // hand-calc: 100 * 2 = 200 subtotal; (120 - 100) * 2 = 40 discount;
    //   GST = 200 * 0.05 = 10
    expect(calculateLineGst({ sellingPrice: 100, mrp: 120, quantity: 2, gstRate: 0.05 })).toEqual({
      itemSubtotal: 200,
      itemDiscount: 40,
      gstAmount: 10,
    })
  })

  it('yields zero GST for a zero rate', () => {
    expect(
      calculateLineGst({ sellingPrice: 50, mrp: 60, quantity: 3, gstRate: 0 }).gstAmount
    ).toBe(0)
  })

  it('yields zero discount when mrp equals selling price', () => {
    expect(
      calculateLineGst({ sellingPrice: 80, mrp: 80, quantity: 2, gstRate: 0.12 }).itemDiscount
    ).toBe(0)
  })

  it('keeps raw fractional paise before rounding', () => {
    // hand-calc: 99.99 * 3 = 299.97; GST = 299.97 * 0.18 = 53.9946
    const line = calculateLineGst({ sellingPrice: 99.99, mrp: 129.99, quantity: 3, gstRate: 0.18 })
    expect(line.itemSubtotal).toBeCloseTo(299.97, 10)
    expect(line.gstAmount).toBeCloseTo(53.9946, 10)
  })
})

describe('calculateBillTotals (per bill)', () => {
  it('sums two hand-calculated lines', () => {
    // line 1: 100 * 2 = 200 subtotal, (120-100)*2 = 40 discount, 200*0.05 = 10 tax
    // line 2: 50 * 1 = 50 subtotal, (60-50)*1 = 10 discount, 50*0.12 = 6 tax
    // totals: subtotal 250, discount 50, tax 16, total 266
    const totals = calculateBillTotals([
      { sellingPrice: 100, mrp: 120, quantity: 2, gstRate: 0.05 },
      { sellingPrice: 50, mrp: 60, quantity: 1, gstRate: 0.12 },
    ])
    expect(totals).toEqual({ subtotal: 250, totalDiscount: 50, totalTax: 16, total: 266 })
  })

  it('returns zeros for an empty bill', () => {
    expect(calculateBillTotals([])).toEqual({ subtotal: 0, totalDiscount: 0, totalTax: 0, total: 0 })
  })

  it('rounds fractional paise to 2 decimals', () => {
    // hand-calc: 99.99 * 3 = 299.97 subtotal; tax 53.9946 -> 53.99;
    //   total 353.9646 -> 353.96
    const rounded = calculateBillTotalsRounded([
      { sellingPrice: 99.99, mrp: 129.99, quantity: 3, gstRate: 0.18 },
    ])
    expect(rounded.subtotal).toBe(299.97)
    expect(rounded.totalTax).toBe(53.99)
    expect(rounded.total).toBe(353.96)
  })

  it('rounds half-paise up (banker-free Math.round)', () => {
    // 2.345 -> 2.35 ; 2.335 -> 2.34 (float-safe representative cases)
    expect(round2(2.345)).toBe(2.35)
    expect(round2(10.005)).toBe(10.01)
  })
})
