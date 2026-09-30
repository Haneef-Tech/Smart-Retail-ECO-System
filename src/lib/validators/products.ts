import { z } from 'zod'

const money = z.coerce.number().finite().min(0, 'Must be >= 0').max(10_000_000, 'Value too large')
const intQty = z.coerce.number().int().min(0).max(1_000_000)

export const productQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
  search: z.string().trim().max(100).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const productCreateSchema = z.object({
  id: z.string().trim().min(1).max(50).optional(),
  sku: z.string().trim().min(1, 'SKU is required').max(30),
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.string().trim().min(1, 'categoryId is required').max(100),
  brand: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(30).optional(),
  mrp: money,
  sellingPrice: money,
  taxRate: z.coerce.number().finite().min(0).max(1).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  supplierId: z.string().trim().max(100).nullish(),
  reorderLevel: intQty.optional(),
  safetyStock: intQty.optional(),
  leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
});

export const productUpdateSchema = productCreateSchema
  .omit({ id: true, sku: true })
  .partial()
  .extend({
    sku: z.string().trim().min(1).max(30).optional(),
    isActive: z.boolean().optional(),
  });

export const gstRateSchema = z.object({
  category: z.string().trim().min(1, 'category is required').max(80),
  rate: z.coerce.number().finite().min(0, 'rate must be >= 0').max(1, 'rate must be <= 1'),
});

/** Admin inventory entry (new product + opening stock in one call). */
export const inventoryEntrySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  sku: z.string().trim().max(30).optional(),
  categoryId: z.string().trim().min(1, 'categoryId is required').max(100),
  supplierId: z.string().trim().max(100).nullish(),
  mrp: money,
  sellingPrice: money,
  unit: z.string().trim().max(30).optional(),
  initialStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  reorderLevel: z.coerce.number().int().min(0).max(1_000_000).optional(),
  safetyStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  description: z.string().trim().max(2000).optional(),
});

const boundedDelta = z.coerce.number().int().min(-1_000_000).max(1_000_000);

export const stockAdjustSchema = z
  .object({
    productId: z.string().trim().min(1, 'productId is required').max(100),
    changeQty: boundedDelta.optional(),
    setQty: z.coerce.number().int().min(0).max(1_000_000).optional(),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.changeQty !== undefined || v.setQty !== undefined, {
    message: 'Provide exactly one of changeQty or setQty',
    path: ['changeQty'],
  });
