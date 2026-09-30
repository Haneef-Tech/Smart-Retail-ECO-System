import { z } from 'zod'

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1, 'productId is required').max(100),
  quantity: z.number().int().min(1, 'quantity must be >= 1').max(1000, 'quantity too large'),
  // Client echoes (name/category) are accepted for messages but NEVER trusted
  // for pricing — totals, discounts and GST are recomputed from the database.
  name: z.string().trim().max(200).optional(),
  category: z.string().trim().max(80).optional(),
});

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must contain at least 1 item').max(100, 'Too many line items'),
  deliveryAddress: z.string().trim().min(5, 'Delivery address is required').max(500),
  notes: z.string().trim().max(500).optional(),
  customerId: z.string().trim().max(100).optional(),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  customerEmail: z.string().trim().max(254).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'], {
    message: 'status must be PENDING, CONFIRMED, DELIVERED or CANCELLED',
  }),
});
