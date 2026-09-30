import { describe, expect, it } from 'vitest'
import {
  evaluateModel,
  forecastExponentialSmoothing,
  forecastMovingAverage,
  forecastNaive,
  forecastSeasonalNaive,
  selectBestModel,
  type ModelCandidate,
} from '@/lib/forecasting/engine'

describe('forecastNaive', () => {
  it('returns the last observation', () => {
    // hand-calc: last of [4, 7, 9] is 9
    expect(forecastNaive([4, 7, 9])).toBe(9)
  })

  it('handles a single data point', () => {
    expect(forecastNaive([5])).toBe(5)
  })

  it('returns 0 for empty data', () => {
    expect(forecastNaive([])).toBe(0)
  })

  it('handles all zeros', () => {
    expect(forecastNaive([0, 0, 0])).toBe(0)
  })
})

describe('forecastMovingAverage', () => {
  it('averages the trailing window', () => {
    // hand-calc: last 2 of [10, 20, 30] = (20 + 30) / 2 = 25
    expect(forecastMovingAverage([10, 20, 30], 2)).toBe(25)
  })

  it('uses the whole series when shorter than the window', () => {
    // hand-calc: (10 + 20 + 30 + 40) / 4 = 25
    expect(forecastMovingAverage([10, 20, 30, 40])).toBe(25)
  })

  it('handles a single data point', () => {
    expect(forecastMovingAverage([8])).toBe(8)
  })

  it('returns 0 for empty data', () => {
    expect(forecastMovingAverage([])).toBe(0)
  })

  it('handles all zeros', () => {
    expect(forecastMovingAverage([0, 0, 0, 0])).toBe(0)
  })
})

describe('forecastSeasonalNaive', () => {
  it('applies the lift factor to the 14-day moving average', () => {
    // hand-calc: MA of [10, 20, 30] = 20; 20 * 1.5 = 30
    expect(forecastSeasonalNaive([10, 20, 30], 1.5)).toBe(30)
  })

  it('uses the default lift factor (1.35)', () => {
    // hand-calc: MA of [10, 10, 10, 10] = 10; 10 * 1.35 = 13.5
    expect(forecastSeasonalNaive([10, 10, 10, 10])).toBeCloseTo(13.5, 10)
  })

  it('returns 0 for empty data', () => {
    expect(forecastSeasonalNaive([])).toBe(0)
  })
})

describe('forecastExponentialSmoothing', () => {
  it('smooths with alpha = 0.3', () => {
    // hand-calc: s0 = 10
    //   s1 = 0.3*20 + 0.7*10 = 6 + 7 = 13
    //   s2 = 0.3*30 + 0.7*13 = 9 + 9.1 = 18.1
    expect(forecastExponentialSmoothing([10, 20, 30], 0.3)).toBeCloseTo(18.1, 10)
  })

  it('handles a single data point', () => {
    expect(forecastExponentialSmoothing([7])).toBe(7)
  })

  it('returns 0 for empty data', () => {
    expect(forecastExponentialSmoothing([])).toBe(0)
  })

  it('handles all zeros', () => {
    expect(forecastExponentialSmoothing([0, 0, 0])).toBe(0)
  })
})

describe('evaluateModel (MAE / RMSE / MAPE)', () => {
  it('returns fallback metrics when history is shorter than 5 periods', () => {
    expect(evaluateModel([1, 2, 3], forecastNaive)).toEqual({ mae: 1.5, rmse: 2.1, mape: 12.0 })
    expect(evaluateModel([], forecastNaive)).toEqual({ mae: 1.5, rmse: 2.1, mape: 12.0 })
    expect(evaluateModel([5], forecastNaive)).toEqual({ mae: 1.5, rmse: 2.1, mape: 12.0 })
  })

  it('scores a perfect constant series as zero error', () => {
    // every holdout prediction is exact, so all errors are 0
    const metrics = evaluateModel([10, 10, 10, 10, 10, 10], forecastNaive)
    expect(metrics).toEqual({ mae: 0, rmse: 0, mape: 0 })
  })

  it('computes MAE/RMSE/MAPE for a linear series with the naive model', () => {
    // history [10, 20, 30, 40, 50, 60]; holdout = last 5 (20..60).
    // naive predicts the previous value each time, so every |err| = 10.
    //   MAE  = 10
    //   RMSE = sqrt((5 * 100) / 5) = 10
    //   MAPE = (10/20 + 10/30 + 10/40 + 10/50 + 10/60) / 5 * 100 = 29.0
    const metrics = evaluateModel([10, 20, 30, 40, 50, 60], forecastNaive)
    expect(metrics.mae).toBeCloseTo(10, 10)
    expect(metrics.rmse).toBeCloseTo(10, 10)
    expect(metrics.mape).toBeCloseTo(29, 10)
  })

  it('skips zero actuals in MAPE', () => {
    // history [5, 5, 5, 5, 5, 0]: naive errors are all 0 except the last
    // (predict 5, actual 0 -> err 5), and actual = 0 contributes no % error.
    const metrics = evaluateModel([5, 5, 5, 5, 5, 0], forecastNaive)
    // hand-calc: totalError = 5, count = 5 -> MAE = 1
    expect(metrics.mae).toBe(1)
    // hand-calc: RMSE = sqrt(25 / 5) = sqrt(5) ~= 2.24
    expect(metrics.rmse).toBeCloseTo(2.24, 2)
    // hand-calc: only 4 nonzero actuals with 0 error -> MAPE = 0
    expect(metrics.mape).toBe(0)
  })
})

describe('selectBestModel', () => {
  const candidate = (name: ModelCandidate['name'], mae: number): ModelCandidate => ({
    name,
    fn: () => 0,
    metrics: { mae, rmse: mae, mape: mae },
  })

  it('picks the model with the lowest MAE', () => {
    const best = selectBestModel([
      candidate('Naive', 9),
      candidate('Moving Average', 4),
      candidate('Seasonal Naive', 7),
      candidate('Exponential Smoothing', 5),
    ])
    expect(best.name).toBe('Moving Average')
  })

  it('keeps the first model on ties (stable selection)', () => {
    const best = selectBestModel([candidate('Naive', 3), candidate('Moving Average', 3)])
    expect(best.name).toBe('Naive')
  })

  it('handles all-zero metrics', () => {
    const best = selectBestModel([
      candidate('Naive', 0),
      candidate('Moving Average', 0),
      candidate('Seasonal Naive', 0),
      candidate('Exponential Smoothing', 0),
    ])
    expect(best.name).toBe('Naive')
  })
})
