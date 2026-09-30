import { z } from 'zod'
import { orderCreateSchema } from './orders'

/** Checkout posts to /api/orders — same cart shape, plus a strict address profile. */
export const checkoutSchema = orderCreateSchema;

export const addressProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(6, 'Phone is required')
    .max(20)
    .regex(/^[+\d][\d\s-]{5,19}$/, 'Invalid phone number'),
  email: z.string().trim().max(254).email('Invalid email address').optional(),
  houseStreet: z.string().trim().min(2, 'Street address is required').max(200),
  area: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

/** Saved-profile update. Unknown keys are stripped — id/email ownership can never be reassigned. */
export const customerUpdateSchema = addressProfileSchema.partial();
