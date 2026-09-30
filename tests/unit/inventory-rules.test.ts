import { describe, expect, it } from 'vitest'
import {
  calculateRecommendedQty,
  calculateReorderPoint,
  classifyDeadStock,
  classifyUrgency,
} from '@/lib/inventory-rules'

describe('calculateReorderPoint', () => {
  it('computes the base reorder point without seasonal lift', () => {
    // hand-calc: round(10 * 3 * 1.0 + 5) = 35
    expect(calculateReorderPoint(10, 3, 1.0, 5)).toBe(35)
  })

  it('scales demand by the seasonal lift factor', () => {
    // hand-calc: round(10 * 3 * 1.3 + 5) = round(44) = 44
    expect(calculateReorderPoint(10, 3, 1.3, 5)).toBe(44)
  })

  it('rounds fractional results', () => {
    // hand-calc: round(2.5 * 3 * 1.0 + 2) = round(9.5) = 10
    expect(calculateReorderPoint(2.5, 3, 1.0, 2)).toBe(10)
  })

  it('returns safety stock when there is no demand', () => {
    expect(calculateReorderPoint(0, 5, 1.2, 7)).toBe(7)
  })
})

describe('calculateRecommendedQty', () => {
  it('computes forecast + safety - stock - incoming', () => {
    // hand-calc: 300 + 20 - 100 - 30 = 190
    expect(calculateRecommendedQty(300, 20, 100, 30)).toBe(190)
  })

  it('floors overstock at zero instead of going negative', () => {
    // hand-calc: 50 + 5 - 200 - 0 = -145 -> 0
    expect(calculateRecommendedQty(50, 5, 200, 0)).toBe(0)
  })

  it('counts confirmed incoming PO stock', () => {
    // hand-calc: 100 + 10 - 40 - 70 = 0
    expect(calculateRecommendedQty(100, 10, 40, 70)).toBe(0)
  })
})

describe('classifyUrgency', () => {
  it('is HIGH when stock is at/below safety stock', () => {
    expect(classifyUrgency(5, 5, 35, 190)).toBe('HIGH')
  })

  it('is MEDIUM when stock is at/below the reorder point', () => {
    expect(classifyUrgency(30, 5, 35, 50)).toBe('MEDIUM')
  })

  it('is LOW when a purchase is recommended but stock is healthy', () => {
    expect(classifyUrgency(100, 5, 35, 20)).toBe('LOW')
  })

  it('is OPTIMAL when nothing needs ordering', () => {
    expect(classifyUrgency(100, 5, 35, 0)).toBe('OPTIMAL')
  })
})

describe('classifyDeadStock', () => {
  it('flags zero 30-day sales with heavy stock as DEAD_STOCK', () => {
    // mirrors: unitsSold30 === 0 && stock > 20
    expect(classifyDeadStock(0, 50)).toBe('DEAD_STOCK')
  })

  it('flags zero 30-day sales with light stock as DEAD_STOCK', () => {
    // mirrors: unitsSold30 === 0 && stock > 0
    expect(classifyDeadStock(0, 10)).toBe('DEAD_STOCK')
  })

  it('flags low velocity with high stock as SLOW_MOVING', () => {
    // mirrors: unitsSold30 < 3 && stock > 50
    expect(classifyDeadStock(2, 60)).toBe('SLOW_MOVING')
  })

  it('flags warehouse overstock as OVERSTOCK', () => {
    // mirrors: stock > 200
    expect(classifyDeadStock(10, 250)).toBe('OVERSTOCK')
  })

  it('leaves healthy products alone', () => {
    expect(classifyDeadStock(10, 50)).toBe('HEALTHY')
  })

  it('treats zero stock as healthy (skipped upstream)', () => {
    expect(classifyDeadStock(0, 0)).toBe('HEALTHY')
  })
})
