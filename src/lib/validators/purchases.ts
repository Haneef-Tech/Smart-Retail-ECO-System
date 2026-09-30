import { z } from 'zod'

const money = z.coerce.number().finite().min(0, 'Must be >= 0').max(100_000_000, 'Value too large')

export const purchaseCreateSchema = z.object({
  supplierId: z.string().trim().min(1, 'supplierId is required').max(100),
  productId: z.string().trim().min(1, 'productId is required').max(100),
  quantity: z.coerce.number().int().min(1, 'quantity must be >= 1').max(100_000, 'quantity too large'),
  // Optional override; otherwise the server derives price from the product (0.75 × MRP logic).
  purchasePrice: money.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const purchaseStatusSchema = z.object({
  purchaseId: z.string().trim().min(1, 'purchaseId is required').max(100),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'], {
    message: 'status must be PENDING, IN_TRANSIT, DELIVERED or CANCELLED',
  }),
});

export const incomingStockSchema = z.object({
  productId: z.string().trim().min(1, 'productId is required').max(100),
  supplierId: z.string().trim().min(1, 'supplierId is required').max(100),
  quantity: z.coerce.number().int().min(1, 'quantity must be >= 1').max(100_000, 'quantity too large'),
  purchasePrice: money,
  invoiceNumber: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
});
