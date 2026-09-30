import { z } from 'zod'

export const chatSchema = z.object({
  query: z.string().trim().min(1, 'Query is required').max(2000, 'Query exceeds 2000 characters'),
  sessionId: z.string().trim().max(100).optional(),
});

export const executeSchema = z.object({
  action: z.enum(['create_purchase_order', 'update_reorder_point']).optional(),
  productId: z.string().trim().max(100).optional(),
  recommendationId: z.string().trim().max(100).optional(),
  quantity: z.number().int().min(1).max(500).optional(),
  reorderLevel: z.number().int().min(0).max(10000).optional(),
  confirmToken: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{32}$/, 'Invalid confirmation token')
    .optional(),
});
