import { z } from 'zod'

export const supplierCreateSchema = z.object({
  code: z.string().trim().min(1, 'Supplier code is required').max(20),
  name: z.string().trim().min(1, 'Supplier name is required').max(200),
  contactName: z.string().trim().max(100).optional(),
  email: z.string().trim().max(254).email('Invalid email address').nullish(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  categories: z.string().trim().max(200).optional(),
  rating: z.coerce.number().finite().min(0).max(5).optional(),
  leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
});
