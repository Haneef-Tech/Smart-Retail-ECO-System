import { z } from 'zod'

/** Route-param id (product/order/bill ids, SKUs, pincodes). */
export const idParamSchema = z.object({
  id: z.string().min(1, 'id is required').max(100, 'id too long'),
})

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1, 'orderId is required').max(100, 'orderId too long'),
})

/** Loose flag-style query params (?admin=true&all=true) — accepted but never trusted. */
export const flagQuerySchema = z
  .object({
    admin: z.enum(['true', 'false']).optional(),
    all: z.enum(['true', 'false']).optional(),
  })
  .catchall(z.string());

/** Free-text search query (?q=...) with a length cap. */
export const searchQuerySchema = (maxLen: number) =>
  z.object({
    q: z.string().trim().max(maxLen, `Search too long (max ${maxLen} chars)`).optional(),
  });
